-- Agents table for AI Competition Platform
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  weight_class VARCHAR(20) NOT NULL,
  rating INTEGER DEFAULT 1000,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_draws INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_earnings NUMERIC(78, 0) DEFAULT 0,
  staking_tier VARCHAR(10) DEFAULT 'NONE',
  reward_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (true);
