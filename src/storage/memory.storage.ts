import { Campaign } from '../models/campaign.model';
import { ClickRecord } from '../models/click.model';
import { IStorage, DailyStat, ActiveUserStats, ActiveUserFilter, RegisteredApp } from './storage.interface';

interface AppLaunchRecord {
  fingerprint: string;
  ip: string;
  isOrganic: boolean;
  campaignId: string | null;
  platform: string;
  bundleId: string | null;
  launchedAt: Date;
}

export class MemoryStorage implements IStorage {
  private campaigns: Map<string, Campaign> = new Map();
  private clicks: Map<string, ClickRecord> = new Map();
  private clicksByFingerprint: Map<string, string[]> = new Map(); // fingerprint -> clickIds
  private slugToId: Map<string, string> = new Map(); // slug -> campaignId
  private installEvents: Map<string, Date[]> = new Map(); // campaignId -> timestamps
  private appLaunches: AppLaunchRecord[] = [];

  // --- Campaigns ---

  async createCampaign(campaign: Campaign): Promise<Campaign> {
    this.campaigns.set(campaign.id, campaign);
    this.slugToId.set(campaign.slug, campaign.id);
    return campaign;
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) || null;
  }

  async getCampaignBySlug(slug: string): Promise<Campaign | null> {
    const id = this.slugToId.get(slug);
    if (!id) return null;
    return this.campaigns.get(id) || null;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
    const existing = this.campaigns.get(id);
    if (!existing) return null;

    // If slug is changing, update the index
    if (data.slug && data.slug !== existing.slug) {
      this.slugToId.delete(existing.slug);
      this.slugToId.set(data.slug, id);
    }

    const updated: Campaign = { ...existing, ...data, updatedAt: new Date() };
    this.campaigns.set(id, updated);
    return updated;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const existing = this.campaigns.get(id);
    if (!existing) return false;
    this.slugToId.delete(existing.slug);
    this.campaigns.delete(id);
    return true;
  }

  async incrementClickCount(id: string): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (campaign) {
      campaign.clickCount += 1;
    }
  }

  async incrementInstallCount(id: string): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (campaign) {
      campaign.installCount += 1;
    }
  }

  // --- Analytics ---

  async recordInstallEvent(campaignId: string, timestamp: Date): Promise<void> {
    const events = this.installEvents.get(campaignId) || [];
    events.push(timestamp);
    this.installEvents.set(campaignId, events);
  }

  async getDailyStats(campaignId: string): Promise<DailyStat[]> {
    const statsMap: Record<string, { clicks: number; installs: number }> = {};

    // Aggregate clicks by date
    for (const click of this.clicks.values()) {
      if (click.campaignId === campaignId) {
        const date = click.clickedAt.toISOString().split('T')[0];
        if (!statsMap[date]) statsMap[date] = { clicks: 0, installs: 0 };
        statsMap[date].clicks += 1;
      }
    }

    // Aggregate installs by date
    const installDates = this.installEvents.get(campaignId) || [];
    for (const ts of installDates) {
      const date = ts.toISOString().split('T')[0];
      if (!statsMap[date]) statsMap[date] = { clicks: 0, installs: 0 };
      statsMap[date].installs += 1;
    }

    // Sort by date and return
    return Object.entries(statsMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- Clicks ---

  async createClick(click: ClickRecord): Promise<ClickRecord> {
    this.clicks.set(click.id, click);

    const existing = this.clicksByFingerprint.get(click.fingerprint) || [];
    existing.push(click.id);
    this.clicksByFingerprint.set(click.fingerprint, existing);

    return click;
  }

  async createClickIfNotDuplicate(click: ClickRecord): Promise<boolean> {
    const now = Date.now();
    const ids = this.clicksByFingerprint.get(click.fingerprint) || [];
    const hasDuplicate = ids.some(id => {
      const existing = this.clicks.get(id);
      return existing &&
        existing.campaignId === click.campaignId &&
        (now - existing.clickedAt.getTime()) < 10_000;
    });

    if (hasDuplicate) return false;

    await this.createClick(click);
    await this.incrementClickCount(click.campaignId);
    return true;
  }

  async getClicksByFingerprint(fingerprint: string): Promise<ClickRecord[]> {
    const ids = this.clicksByFingerprint.get(fingerprint) || [];
    const clicks: ClickRecord[] = [];
    for (const id of ids) {
      const click = this.clicks.get(id);
      if (click) clicks.push(click);
    }
    return clicks;
  }

  async getClicksByIpAndDevice(ip: string, device: string): Promise<ClickRecord[]> {
    return Array.from(this.clicks.values()).filter(c => c.ip === ip && c.device === device);
  }

  async getClicksByCampaignId(campaignId: string): Promise<ClickRecord[]> {
    return Array.from(this.clicks.values()).filter(c => c.campaignId === campaignId);
  }

  async markClickConsumed(clickId: string): Promise<void> {
    const click = this.clicks.get(clickId);
    if (click) {
      click.consumed = true;
    }
  }

  async purgeExpiredClicks(): Promise<number> {
    const now = new Date();
    let purged = 0;

    for (const [id, click] of this.clicks.entries()) {
      if (click.expiresAt < now) {
        this.clicks.delete(id);

        // Remove from fingerprint index
        const fps = this.clicksByFingerprint.get(click.fingerprint);
        if (fps) {
          const filtered = fps.filter(cid => cid !== id);
          if (filtered.length === 0) {
            this.clicksByFingerprint.delete(click.fingerprint);
          } else {
            this.clicksByFingerprint.set(click.fingerprint, filtered);
          }
        }

        purged++;
      }
    }

    return purged;
  }

  // --- Active Users (App Launches) ---

  async recordAppLaunch(fingerprint: string, ip: string, isOrganic: boolean, campaignId: string | null, platform: string, bundleId: string | null): Promise<void> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Purge old data
    this.appLaunches = this.appLaunches.filter(l => l.launchedAt >= thirtyDaysAgo);

    // Check if this fingerprint already launched today
    const todayStr = now.toISOString().split('T')[0];
    const existingToday = this.appLaunches.find(
      l => l.fingerprint === fingerprint && l.launchedAt.toISOString().split('T')[0] === todayStr
    );

    if (existingToday) {
      // Upgrade organic -> non-organic if a campaign match was found
      if (existingToday.isOrganic && !isOrganic) {
        existingToday.isOrganic = false;
        existingToday.campaignId = campaignId;
      }
    } else {
      this.appLaunches.push({ fingerprint, ip, isOrganic, campaignId, platform, bundleId, launchedAt: now });
    }
  }

  async getActiveUserStats(filter?: ActiveUserFilter): Promise<ActiveUserStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let recent = this.appLaunches.filter(l => l.launchedAt >= thirtyDaysAgo);

    // Apply filters
    if (filter?.platform) {
      recent = recent.filter(l => l.platform === filter.platform);
    }
    if (filter?.bundleId) {
      recent = recent.filter(l => l.bundleId === filter.bundleId);
    }

    const uniqueFingerprints = new Set(recent.map(l => l.fingerprint));
    const nonOrganic = recent.filter(l => !l.isOrganic).length;
    const organic = recent.filter(l => l.isOrganic).length;

    // Daily breakdown
    const dailyMap: Record<string, { total: Set<string>; organic: number; nonOrganic: number }> = {};
    for (const launch of recent) {
      const date = launch.launchedAt.toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { total: new Set(), organic: 0, nonOrganic: 0 };
      }
      dailyMap[date].total.add(launch.fingerprint);
      if (launch.isOrganic) {
        dailyMap[date].organic += 1;
      } else {
        dailyMap[date].nonOrganic += 1;
      }
    }

    const daily = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        total: data.total.size,
        organic: data.organic,
        nonOrganic: data.nonOrganic,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalActiveUsers: uniqueFingerprints.size,
      nonOrganicInstalls: nonOrganic,
      organicInstalls: organic,
      daily,
    };
  }

  async getRegisteredApps(): Promise<RegisteredApp[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = this.appLaunches.filter(l => l.launchedAt >= thirtyDaysAgo && l.bundleId);

    const seen = new Set<string>();
    const apps: RegisteredApp[] = [];
    for (const launch of recent) {
      const key = `${launch.platform}|${launch.bundleId}`;
      if (!seen.has(key)) {
        seen.add(key);
        apps.push({ platform: launch.platform, bundleId: launch.bundleId! });
      }
    }
    return apps.sort((a, b) => a.platform.localeCompare(b.platform) || a.bundleId.localeCompare(b.bundleId));
  }

  async getRegisteredPlatforms(): Promise<string[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = this.appLaunches.filter(l => l.launchedAt >= thirtyDaysAgo);
    return [...new Set(recent.map(l => l.platform))].sort();
  }

  async clearAppLaunches(): Promise<void> {
    this.appLaunches = [];
    this.campaigns.clear();
    this.clicks.clear();
    this.clicksByFingerprint.clear();
    this.slugToId.clear();
    this.installEvents.clear();
  }
}
