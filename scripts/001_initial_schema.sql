-- TheEndGame Database Schema
-- Initial migration for AI Competition Platform

-- ==========================================
-- AGENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  weight_class VARCHAR(20) NOT NULL CHECK (weight_class IN ('lightweight', 'middleweight', 'heavyweight', 'open')),
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

CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agents_rating ON agents(rating DESC);

-- ==========================================
-- CHALLENGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  tags TEXT[] DEFAULT '{}',
  base_points INTEGER DEFAULT 100,
  time_limit INTEGER DEFAULT 30,
  sources TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  times_used INTEGER DEFAULT 0,
  correct_rate DECIMAL(5, 4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);

-- ==========================================
-- MATCHES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id VARCHAR(66) UNIQUE,
  game_type VARCHAR(30) NOT NULL CHECK (game_type IN ('turing_arena', 'inference_race', 'consensus_game', 'survival_round')),
  weight_class VARCHAR(20) NOT NULL,
  prize_pool NUMERIC(78, 0) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'disputed')),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 5,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES agents(id),
  winner_wallet VARCHAR(42),
  tx_hash VARCHAR(66),
  created_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);

-- ==========================================
-- MATCH PARTICIPANTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  final_score INTEGER DEFAULT 0,
  accuracy DECIMAL(5, 4) DEFAULT 0,
  avg_response_time INTEGER,
  rank INTEGER,
  reward_amount NUMERIC(78, 0) DEFAULT 0,
  rating_before INTEGER,
  rating_after INTEGER,
  rating_change INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_match ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_participants_agent ON match_participants(agent_id);

-- ==========================================
-- MATCH ROUNDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS match_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  round_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  UNIQUE(match_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_match ON match_rounds(match_id);

-- ==========================================
-- SUBMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES match_rounds(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  answer TEXT NOT NULL,
  response_time INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_correct BOOLEAN,
  accuracy_score INTEGER DEFAULT 0,
  speed_score INTEGER DEFAULT 0,
  clarity_score INTEGER DEFAULT 0,
  creativity_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  evaluated_at TIMESTAMPTZ,
  UNIQUE(round_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_match ON submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_submissions_agent ON submissions(agent_id);

-- ==========================================
-- TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  block_number BIGINT,
  tx_type VARCHAR(30) NOT NULL CHECK (tx_type IN ('reward', 'stake', 'unstake', 'transfer')),
  from_wallet VARCHAR(42),
  to_wallet VARCHAR(42) NOT NULL,
  amount NUMERIC(78, 0) NOT NULL,
  match_id UUID REFERENCES matches(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_to_wallet ON transactions(to_wallet);

-- ==========================================
-- DAILY STATS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_matches INTEGER DEFAULT 0,
  total_agents_active INTEGER DEFAULT 0,
  new_agents INTEGER DEFAULT 0,
  total_viq_distributed NUMERIC(78, 0) DEFAULT 0,
  total_viq_staked NUMERIC(78, 0) DEFAULT 0,
  platform_stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (true);

CREATE POLICY "matches_select" ON matches FOR SELECT USING (true);
CREATE POLICY "matches_insert" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "matches_update" ON matches FOR UPDATE USING (true);

CREATE POLICY "participants_select" ON match_participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON match_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_update" ON match_participants FOR UPDATE USING (true);

CREATE POLICY "rounds_select" ON match_rounds FOR SELECT USING (true);
CREATE POLICY "rounds_insert" ON match_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "rounds_update" ON match_rounds FOR UPDATE USING (true);

CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "submissions_update" ON submissions FOR UPDATE USING (true);

CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (true);

CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "daily_stats_select" ON daily_stats FOR SELECT USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
