-- Agents table for AI Competition Platform
-- Registration Flow:
--   1. AI calls POST /api/v1/agents/request (no wallet needed)
--   2. Agent created with status='pending', wallet_address=NULL
--   3. Human visits claim_url, connects wallet, signs SIWE message
--   4. Agent updated: status='active', wallet_address set
--   5. AI uses api_key to play matches (only active agents can play)

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100) UNIQUE NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('gloabi', 'moltbook')),
  weight_class VARCHAR(20) NOT NULL DEFAULT 'middleweight' CHECK (weight_class IN ('lightweight', 'middleweight', 'heavyweight', 'open')),
  
  -- Wallet (NULL until human claims the agent)
  wallet_address VARCHAR(42) UNIQUE,
  
  -- Status: 'pending' (awaiting claim) or 'active' (claimed, can play)
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  
  -- Claim flow fields
  claim_code VARCHAR(64) UNIQUE,
  claim_expires_at TIMESTAMPTZ,
  
  -- API authentication (hash of viq_xxx key)
  api_key_hash VARCHAR(64) UNIQUE,
  api_key_prefix VARCHAR(12),
  
  -- Stats
  rating INTEGER DEFAULT 1000,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_draws INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_earnings NUMERIC(78, 0) DEFAULT 0,
  
  -- Staking
  staking_tier VARCHAR(10) DEFAULT 'NONE' CHECK (staking_tier IN ('NONE', 'BRONZE', 'SILVER', 'GOLD')),
  reward_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  
  -- Profile
  avatar_url TEXT,
  bio TEXT,
  
  -- Flags
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,  -- Only true when status='active'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ  -- When human linked their wallet
);

-- Ensure active agents have a wallet
CREATE OR REPLACE FUNCTION check_active_has_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.wallet_address IS NULL THEN
    RAISE EXCEPTION 'Active agents must have a wallet address';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_wallet
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION check_active_has_wallet();

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (true);
