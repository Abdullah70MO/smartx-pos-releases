-- SMART X POS - License System Tables
-- Run this in Supabase SQL Editor

-- License keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id BIGSERIAL PRIMARY KEY,
  key_string TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  license_type TEXT NOT NULL DEFAULT 'lifetime',
  current_activations INTEGER DEFAULT 0,
  max_activations INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activations table
CREATE TABLE IF NOT EXISTS activations (
  id BIGSERIAL PRIMARY KEY,
  key_id BIGINT REFERENCES license_keys(id) ON DELETE CASCADE,
  hwid TEXT NOT NULL,
  device_name TEXT DEFAULT '',
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(key_id, hwid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_license_keys_key_string ON license_keys(key_string);
CREATE INDEX IF NOT EXISTS idx_activations_key_id ON activations(key_id);
CREATE INDEX IF NOT EXISTS idx_activations_hwid ON activations(hwid);

-- Enable Row Level Security
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

-- RLS: Allow anon access for the Vercel API (these are safe because the API validates before calling)
-- The API uses service_role key which bypasses RLS entirely
-- These policies are for direct dashboard access
CREATE POLICY "anon_can_read_active_keys" ON license_keys
  FOR SELECT USING (is_active = true);

CREATE POLICY "anon_can_read_activations" ON activations
  FOR SELECT USING (true);

-- Insert a test key (lifetime)
INSERT INTO license_keys (key_string, license_type, max_activations)
VALUES ('SMARTX-LIFETIME-TEST-001', 'lifetime', 3)
ON CONFLICT (key_string) DO NOTHING;

-- Insert a test key (monthly)
INSERT INTO license_keys (key_string, license_type, max_activations)
VALUES ('SMARTX-MONTHLY-TEST-001', 'month', 1)
ON CONFLICT (key_string) DO NOTHING;
