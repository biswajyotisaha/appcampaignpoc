-- Campaign Attribution Server - Database Schema
-- Run this to initialize the database tables

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

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_clicks_fingerprint ON clicks(fingerprint);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_id ON clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_expires_at ON clicks(expires_at);
CREATE INDEX IF NOT EXISTS idx_install_events_campaign_id ON install_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
