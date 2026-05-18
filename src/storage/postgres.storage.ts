import { Pool } from 'pg';
import { Campaign } from '../models/campaign.model';
import { ClickRecord } from '../models/click.model';
import { IStorage, DailyStat } from './storage.interface';
import { logger } from '../utils/logger';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  ios_url TEXT NOT NULL,
  android_url TEXT NOT NULL,
  fallback_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  deep_link JSONB DEFAULT NULL,
  click_count INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  fingerprint VARCHAR(128) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  device VARCHAR(20) NOT NULL,
  referer TEXT,
  clicked_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS install_events (
  id SERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clicks_fingerprint ON clicks(fingerprint);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_id ON clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_expires_at ON clicks(expires_at);
CREATE INDEX IF NOT EXISTS idx_install_events_campaign_id ON install_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
`;

export class PostgresStorage implements IStorage {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  /**
   * Creates tables if they don't exist.
   */
  async initialize(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);
    logger.info('PostgreSQL schema initialized');
  }

  // --- Campaigns ---

  async createCampaign(campaign: Campaign): Promise<Campaign> {
    const result = await this.pool.query(
      `INSERT INTO campaigns (id, name, slug, ios_url, android_url, fallback_url, metadata, deep_link, click_count, install_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        campaign.id,
        campaign.name,
        campaign.slug,
        campaign.iosUrl,
        campaign.androidUrl,
        campaign.fallbackUrl,
        JSON.stringify(campaign.metadata || {}),
        campaign.deepLink ? JSON.stringify(campaign.deepLink) : null,
        campaign.clickCount,
        campaign.installCount,
        campaign.createdAt,
        campaign.updatedAt,
      ]
    );
    return this.rowToCampaign(result.rows[0]);
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    const result = await this.pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.rowToCampaign(result.rows[0]);
  }

  async getCampaignBySlug(slug: string): Promise<Campaign | null> {
    const result = await this.pool.query('SELECT * FROM campaigns WHERE slug = $1', [slug]);
    if (result.rows.length === 0) return null;
    return this.rowToCampaign(result.rows[0]);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    const result = await this.pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    return result.rows.map(row => this.rowToCampaign(row));
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
    const existing = await this.getCampaignById(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, updatedAt: new Date() };
    const result = await this.pool.query(
      `UPDATE campaigns SET
        name = $2, slug = $3, ios_url = $4, android_url = $5, fallback_url = $6,
        metadata = $7, deep_link = $8, click_count = $9, install_count = $10, updated_at = $11
       WHERE id = $1
       RETURNING *`,
      [
        id,
        updated.name,
        updated.slug,
        updated.iosUrl,
        updated.androidUrl,
        updated.fallbackUrl,
        JSON.stringify(updated.metadata || {}),
        updated.deepLink ? JSON.stringify(updated.deepLink) : null,
        updated.clickCount,
        updated.installCount,
        updated.updatedAt,
      ]
    );
    return this.rowToCampaign(result.rows[0]);
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async incrementClickCount(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE campaigns SET click_count = click_count + 1, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  async incrementInstallCount(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE campaigns SET install_count = install_count + 1, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  // --- Analytics ---

  async recordInstallEvent(campaignId: string, timestamp: Date): Promise<void> {
    await this.pool.query(
      'INSERT INTO install_events (campaign_id, installed_at) VALUES ($1, $2)',
      [campaignId, timestamp]
    );
  }

  async getDailyStats(campaignId: string): Promise<DailyStat[]> {
    const result = await this.pool.query(
      `SELECT
        dates.date,
        COALESCE(c.clicks, 0)::int AS clicks,
        COALESCE(i.installs, 0)::int AS installs
      FROM (
        SELECT DISTINCT date FROM (
          SELECT DATE(clicked_at) AS date FROM clicks WHERE campaign_id = $1
          UNION
          SELECT DATE(installed_at) AS date FROM install_events WHERE campaign_id = $1
        ) all_dates
      ) dates
      LEFT JOIN (
        SELECT DATE(clicked_at) AS date, COUNT(*)::int AS clicks
        FROM clicks WHERE campaign_id = $1
        GROUP BY DATE(clicked_at)
      ) c ON c.date = dates.date
      LEFT JOIN (
        SELECT DATE(installed_at) AS date, COUNT(*)::int AS installs
        FROM install_events WHERE campaign_id = $1
        GROUP BY DATE(installed_at)
      ) i ON i.date = dates.date
      ORDER BY dates.date`,
      [campaignId]
    );

    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      clicks: row.clicks,
      installs: row.installs,
    }));
  }

  // --- Clicks ---

  async createClick(click: ClickRecord): Promise<ClickRecord> {
    await this.pool.query(
      `INSERT INTO clicks (id, campaign_id, fingerprint, ip, user_agent, device, referer, clicked_at, expires_at, consumed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        click.id,
        click.campaignId,
        click.fingerprint,
        click.ip,
        click.userAgent,
        click.device,
        click.referer,
        click.clickedAt,
        click.expiresAt,
        click.consumed,
      ]
    );
    return click;
  }

  async getClicksByFingerprint(fingerprint: string): Promise<ClickRecord[]> {
    const result = await this.pool.query(
      'SELECT * FROM clicks WHERE fingerprint = $1',
      [fingerprint]
    );
    return result.rows.map(row => this.rowToClick(row));
  }

  async getClicksByCampaignId(campaignId: string): Promise<ClickRecord[]> {
    const result = await this.pool.query(
      'SELECT * FROM clicks WHERE campaign_id = $1 ORDER BY clicked_at DESC',
      [campaignId]
    );
    return result.rows.map(row => this.rowToClick(row));
  }

  async markClickConsumed(clickId: string): Promise<void> {
    await this.pool.query('UPDATE clicks SET consumed = TRUE WHERE id = $1', [clickId]);
  }

  async purgeExpiredClicks(): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM clicks WHERE expires_at < NOW()'
    );
    return result.rowCount ?? 0;
  }

  // --- Helpers ---

  private rowToCampaign(row: any): Campaign {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      iosUrl: row.ios_url,
      androidUrl: row.android_url,
      fallbackUrl: row.fallback_url,
      metadata: row.metadata || {},
      deepLink: row.deep_link || undefined,
      clickCount: row.click_count,
      installCount: row.install_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private rowToClick(row: any): ClickRecord {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      fingerprint: row.fingerprint,
      ip: row.ip,
      userAgent: row.user_agent,
      device: row.device,
      referer: row.referer,
      clickedAt: new Date(row.clicked_at),
      expiresAt: new Date(row.expires_at),
      consumed: row.consumed,
    };
  }
}
