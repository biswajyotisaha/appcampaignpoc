import { Pool } from 'pg';
import { Campaign } from '../models/campaign.model';
import { ClickRecord } from '../models/click.model';
import { IStorage, DailyStat } from './storage.interface';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class PostgresStorage implements IStorage {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  /**
   * Runs the schema.sql file to create tables if they don't exist.
   */
  async initialize(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await this.pool.query(schema);
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
