-- Migration: Add support for two-phase agent registration
-- This allows agents to register first, then link a wallet later

-- 1. Make wallet_address nullable (for pending agents)
ALTER TABLE agents ALTER COLUMN wallet_address DROP NOT NULL;

-- 2. Add claim fields for pending agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_code VARCHAR(64) UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;

-- 3. Add API key fields (stored as hash for security)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(64) UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(12);

-- 4. Add registration status field
ALTER TABLE agents ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'active';
-- Values: 'pending' (needs wallet), 'active' (ready to battle), 'suspended'

-- 5. Create index for claim lookups
CREATE INDEX IF NOT EXISTS idx_agents_claim_code ON agents(claim_code) WHERE claim_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_api_key_hash ON agents(api_key_hash) WHERE api_key_hash IS NOT NULL;

-- 6. Update RLS to allow inserting pending agents
DROP POLICY IF EXISTS "agents_insert" ON agents;
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (true);

-- 7. Function to clean up expired pending agents (run as cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_agents()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agents 
  WHERE registration_status = 'pending' 
    AND claim_expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Note: Set up a Supabase cron job to run cleanup_expired_pending_agents() daily
