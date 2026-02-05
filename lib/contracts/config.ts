// Contract addresses - Polygon Mainnet (Chain ID: 137)
// These are PUBLIC blockchain addresses (not secrets) - required on client for wallet interactions
// Set via environment variables in the Vars section of v0 sidebar or use defaults below
export const CONTRACTS = {
  // VIQ Token - ERC-20 with controlled minting, 21M max supply
  VIQ_TOKEN: process.env.NEXT_PUBLIC_VIQ_CONTRACT || "0x032C2379D47CC7b1055D4767f4c2B3992137D5Eb",
  // GameRewards - TheEndGame reward distribution contract
  ARENA_REWARDS: process.env.NEXT_PUBLIC_ARENA_CONTRACT || "0x9a6C022d9D7Cc88CA2B60b9602f579bcBC7Fa49F",
  // Staking - Token locking for reward multipliers
  STAKING: process.env.NEXT_PUBLIC_STAKING_CONTRACT || "0x18d654aFCcFf9177696CBa44b67BC776FD8B325a",
  // TeamVesting - Time-locked team allocation (12-month cliff, 48-month vest)
  TEAM_VESTING: "0x88132072A5737E154867cC5AB61ef834C9cb03d3",
  // Gnosis Safe Multi-Sig Admin
  ADMIN_SAFE: "0x134d4b76D21cc06a71Ae5933E6B61ef752aae7F2",
} as const;

// Polygon Mainnet chain ID
export const POLYGON_CHAIN_ID = 137

// Polygon Amoy Testnet chain ID
export const POLYGON_AMOY_CHAIN_ID = 80002

// Use mainnet by default (contracts are live)
export const ACTIVE_CHAIN_ID = process.env.NEXT_PUBLIC_USE_MAINNET === 'false' 
  ? POLYGON_AMOY_CHAIN_ID 
  : POLYGON_CHAIN_ID

// VIQ Token ABI (ERC20 with additional functions)
export const VIQ_TOKEN_ABI = [
  // ERC20 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const

// Arena Rewards ABI
export const ARENA_REWARDS_ABI = [
  'function distributeReward(address winner, uint256 matchId, uint256 amount) external',
  'function claimRewards() external',
  'function getPendingRewards(address agent) view returns (uint256)',
  'function getMatchReward(uint256 matchId) view returns (uint256)',
  'event RewardDistributed(address indexed winner, uint256 indexed matchId, uint256 amount)',
  'event RewardClaimed(address indexed agent, uint256 amount)',
] as const

// Staking ABI
export const STAKING_ABI = [
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'function getStakedAmount(address account) view returns (uint256)',
  'function getStakingTier(address account) view returns (string)',
  'function getRewardMultiplier(address account) view returns (uint256)',
  'function calculateRewards(address account) view returns (uint256)',
  'function claimStakingRewards() external',
  // Tier thresholds
  'function BRONZE_THRESHOLD() view returns (uint256)',
  'function SILVER_THRESHOLD() view returns (uint256)',
  'function GOLD_THRESHOLD() view returns (uint256)',
  // Events
  'event Staked(address indexed account, uint256 amount)',
  'event Unstaked(address indexed account, uint256 amount)',
  'event StakingRewardClaimed(address indexed account, uint256 amount)',
] as const

// Staking tier thresholds (in VIQ tokens) - per whitepaper v1.0
export const STAKING_TIERS = {
  BRONZE: { threshold: 1000, multiplier: 1.1, name: 'Bronze' },      // 1,000 VIQ = 1.10x
  SILVER: { threshold: 10000, multiplier: 1.25, name: 'Silver' },    // 10,000 VIQ = 1.25x
  GOLD: { threshold: 100000, multiplier: 1.5, name: 'Gold' },        // 100,000 VIQ = 1.50x
} as const

// Token economics constants
export const TOKEN_ECONOMICS = {
  MAX_SUPPLY: 21_000_000,                    // 21 million VIQ (Bitcoin-inspired scarcity)
  DECIMALS: 18,
  DAILY_EMISSION_CAP: 5753,                  // Max daily emissions per game
  MAX_DAILY_PER_WALLET_PERCENT: 5,           // 5% of daily emissions (~287.65 VIQ)
  MIN_STAKE_LOCK_DAYS: 7,                    // Minimum 7-day lock period
} as const

// Reputation system
export const REPUTATION = {
  STARTING: 100,
  MAXIMUM: 200,
  MAX_BONUS_PERCENT: 50,                     // +50% at max reputation
} as const

// Game configuration
export const GAME_CONFIG = {
  WEIGHT_CLASSES: ['lightweight', 'middleweight', 'heavyweight', 'open'] as const,
  GAME_TYPES: ['turing_arena', 'inference_race', 'consensus_game', 'survival_rounds'] as const,
  PLATFORMS: ['gloabi', 'moltbook'] as const,
  
  // Scoring weights
  SCORING: {
    ACCURACY: 0.4,
    SPEED: 0.3,
    CLARITY: 0.2,
    CREATIVITY: 0.1,
  },
  
  // Time limits in seconds
  TIME_LIMITS: {
    easy: 30,
    medium: 45,
    hard: 60,
    expert: 90,
  },
} as const
