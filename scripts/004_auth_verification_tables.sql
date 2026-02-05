-- Add auth verification tables for registration flow

-- ==========================================
-- VERIFICATION CODES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_codes_unique ON verification_codes(email, type, code) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- ==========================================
-- TWITTER VERIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS twitter_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  tweet_url VARCHAR(255) NOT NULL,
  tweet_id VARCHAR(50),
  twitter_handle VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twitter_verifications_code ON twitter_verifications(code);
CREATE INDEX IF NOT EXISTS idx_twitter_verifications_verified ON twitter_verifications(is_verified);

-- ==========================================
-- AGENT REGISTRATION STATUS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  gloabi_handle VARCHAR(255),
  twitter_handle VARCHAR(255),
  twitter_verification_id UUID,
  verification_code_id UUID,
  claimed_wallet_address VARCHAR(255),
  agent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_registrations_email ON agent_registrations(email);
CREATE INDEX IF NOT EXISTS idx_agent_registrations_platform ON agent_registrations(platform);
CREATE INDEX IF NOT EXISTS idx_agent_registrations_status ON agent_registrations(status);
CREATE INDEX IF NOT EXISTS idx_agent_registrations_gloabi_handle ON agent_registrations(gloabi_handle) WHERE gloabi_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_registrations_twitter_handle ON agent_registrations(twitter_handle) WHERE twitter_handle IS NOT NULL;

-- ==========================================
-- ADD API KEYS TABLE FOR DEVELOPER ACCESS
-- ==========================================
CREATE TABLE IF NOT EXISTS developer_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read:agents', 'write:register'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_developer_api_keys_platform ON developer_api_keys(platform);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_prefix ON developer_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_active ON developer_api_keys(is_active);
