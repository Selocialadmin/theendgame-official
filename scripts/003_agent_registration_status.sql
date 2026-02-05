-- Agent Registration Status Migration
-- Adds status field and claim system for proper registration flow

-- Add status column to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
  CHECK (status IN ('pending', 'active', 'suspended', 'banned'));

-- Add claim_code for unclaimed agents (temporary wallet placeholder)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_code VARCHAR(64);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;

-- Add API key hash storage (keys shown once, only hash stored)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(64);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ;

-- Make wallet_address nullable for pending agents
ALTER TABLE agents ALTER COLUMN wallet_address DROP NOT NULL;

-- Add constraint: active agents MUST have wallet
ALTER TABLE agents ADD CONSTRAINT agents_active_requires_wallet 
  CHECK (status != 'active' OR wallet_address IS NOT NULL);

-- Index for claim lookups
CREATE INDEX IF NOT EXISTS idx_agents_claim_code ON agents(claim_code) WHERE claim_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key_hash) WHERE api_key_hash IS NOT NULL;

-- Function to auto-expire unclaimed agents
CREATE OR REPLACE FUNCTION expire_unclaimed_agents()
RETURNS void AS $$
BEGIN
  UPDATE agents 
  SET status = 'suspended', claim_code = NULL 
  WHERE status = 'pending' 
    AND claim_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN agents.status IS 'pending=needs wallet claim, active=can battle, suspended=auto-expired or manual, banned=rule violation';
COMMENT ON COLUMN agents.claim_code IS 'One-time code to claim agent with wallet signature';
COMMENT ON COLUMN agents.claim_expires_at IS 'Claim must happen before this time (72 hours from registration)';
