import { Campaign, CreateCampaignDto, UpdateCampaignDto } from '../models/campaign.model';
import { ClickRecord } from '../models/click.model';

export interface DailyStat {
  date: string; // YYYY-MM-DD
  clicks: number;
  installs: number;
}

export interface ActiveUserDailyStat {
  date: string;
  total: number;
  organic: number;
  nonOrganic: number;
}

export interface ActiveUserStats {
  totalActiveUsers: number;
  nonOrganicInstalls: number;
  organicInstalls: number;
  daily: ActiveUserDailyStat[];
}

export interface IStorage {
  // Campaigns
  createCampaign(campaign: Campaign): Promise<Campaign>;
  getCampaignById(id: string): Promise<Campaign | null>;
  getCampaignBySlug(slug: string): Promise<Campaign | null>;
  getAllCampaigns(): Promise<Campaign[]>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | null>;
  deleteCampaign(id: string): Promise<boolean>;
  incrementClickCount(id: string): Promise<void>;
  incrementInstallCount(id: string): Promise<void>;

  // Analytics
  recordInstallEvent(campaignId: string, timestamp: Date): Promise<void>;
  getDailyStats(campaignId: string): Promise<DailyStat[]>;

  // Clicks
  createClick(click: ClickRecord): Promise<ClickRecord>;
  getClicksByFingerprint(fingerprint: string): Promise<ClickRecord[]>;
  getClicksByCampaignId(campaignId: string): Promise<ClickRecord[]>;
  markClickConsumed(clickId: string): Promise<void>;
  purgeExpiredClicks(): Promise<number>;

  // Active Users (app launches)
  recordAppLaunch(fingerprint: string, ip: string, isOrganic: boolean, campaignId: string | null): Promise<void>;
  getActiveUserStats(): Promise<ActiveUserStats>;
  clearAppLaunches(): Promise<void>;
}
