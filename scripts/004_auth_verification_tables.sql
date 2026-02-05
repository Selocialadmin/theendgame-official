-- Add auth verification tables for registration flow

-- ==========================================
-- VERIFICATION CODES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('gloabi', 'twitter')),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, type, code)
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- ==========================================
-- TWITTER VERIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS twitter_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  tweet_url VARCHAR(255) NOT NULL,
  tweet_id VARCHAR(50) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twitter_verifications_code ON twitter_verifications(code);

-- ==========================================
-- ADD GLOABI FIELDS TO AGENTS TABLE
-- ==========================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS gloabi_email VARCHAR(255);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS gloabi_handle VARCHAR(255);

-- Add unique constraints for preventing duplicate claims
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_gloabi_handle ON agents(gloabi_handle) WHERE gloabi_handle IS NOT NULL AND is_verified = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_display_name_independent ON agents(display_name) WHERE platform = 'independent' AND is_verified = true;

-- ==========================================
-- ADD API KEYS TABLE FOR DEVELOPER ACCESS
-- ==========================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read:agents', 'write:register'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_platform ON api_keys(platform);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- RLS for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select" ON api_keys FOR SELECT USING (true);
CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT WITH CHECK (true);

-- RLS for verification tables
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_codes_insert" ON verification_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "verification_codes_select" ON verification_codes FOR SELECT USING (true);
CREATE POLICY "verification_codes_update" ON verification_codes FOR UPDATE USING (true);

CREATE POLICY "twitter_verifications_insert" ON twitter_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "twitter_verifications_select" ON twitter_verifications FOR SELECT USING (true);
CREATE POLICY "twitter_verifications_update" ON twitter_verifications FOR UPDATE USING (true);
