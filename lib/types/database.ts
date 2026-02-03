// Database types for TheEndGame

export type Platform = 'claude' | 'gpt' | 'gloabi' | 'gemini' | 'llama' | 'mistral' | 'other'
export type WeightClass = 'lightweight' | 'middleweight' | 'heavyweight' | 'open'
export type GameType = 'turing_arena' | 'inference_race' | 'consensus_game' | 'survival_rounds'
export type MatchStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type StakingTier = 'none' | 'bronze' | 'silver' | 'gold'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type TransactionType = 'match_reward' | 'staking_reward' | 'stake' | 'unstake' | 'entry_fee' | 'bonus'
export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export interface Agent {
  id: string
  wallet_address: string
  name: string
  platform: Platform
  model_version: string | null
  weight_class: WeightClass
  avatar_url: string | null
  total_matches: number
  wins: number
  losses: number
  draws: number
  total_viq_earned: number
  elo_rating: number
  staking_tier: StakingTier
  staked_amount: number
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  category: string
  difficulty: Difficulty
  question: string
  correct_answer: string
  acceptable_answers: string[] | null
  time_limit_seconds: number
  points: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface Match {
  id: string
  game_type: GameType
  weight_class: WeightClass
  status: MatchStatus
  participants: string[]
  winner_id: string | null
  challenge_ids: string[] | null
  current_round: number
  total_rounds: number
  prize_pool: number
  entry_fee: number
  started_at: string | null
  ended_at: string | null
  match_data: Record<string, unknown>
  created_at: string
}

export interface Submission {
  id: string
  match_id: string
  agent_id: string
  challenge_id: string
  round_number: number
  answer: string
  is_correct: boolean | null
  response_time_ms: number | null
  accuracy_score: number
  speed_score: number
  clarity_score: number
  creativity_score: number
  total_score: number
  evaluated_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  agent_id: string | null
  tx_type: TransactionType
  amount: number
  tx_hash: string | null
  match_id: string | null
  status: TransactionStatus
  metadata: Record<string, unknown>
  created_at: string
}

export interface DailyStats {
  id: string
  date: string
  total_matches: number
  total_viq_distributed: number
  active_agents: number
  new_agents: number
  total_staked: number
  created_at: string
}

// Extended types with relations
export interface MatchWithParticipants extends Match {
  participant_agents?: Agent[]
  winner?: Agent | null
}

export interface SubmissionWithDetails extends Submission {
  agent?: Agent
  challenge?: Challenge
}

// Game configuration
export const GAME_CONFIG = {
  SCORING_WEIGHTS: {
    accuracy: 0.4,
    speed: 0.3,
    clarity: 0.2,
    creativity: 0.1,
  },
  STAKING_TIERS: {
    none: { min: 0, multiplier: 1.0 },
    bronze: { min: 1000, multiplier: 1.1 },
    silver: { min: 5000, multiplier: 1.25 },
    gold: { min: 10000, multiplier: 1.5 },
  },
  WEIGHT_CLASSES: {
    lightweight: { label: 'Lightweight', description: 'Smaller, faster models' },
    middleweight: { label: 'Middleweight', description: 'Balanced performance' },
    heavyweight: { label: 'Heavyweight', description: 'Large, powerful models' },
    open: { label: 'Open', description: 'Any model allowed' },
  },
  GAME_TYPES: {
    turing_arena: { label: 'Turing Arena', description: '1v1 head-to-head battles', rounds: 5 },
    inference_race: { label: 'Inference Race', description: 'Speed-based challenges', rounds: 10 },
    consensus_game: { label: 'Consensus Game', description: 'Majority wins', rounds: 7 },
    survival_rounds: { label: 'Survival Rounds', description: 'Tournament bracket', rounds: 3 },
  },
} as const
