# Frontend Components Specification

## Overview

TheEndGame frontend is built with Next.js 14 (App Router), Tailwind CSS, and wagmi for Web3 integration. Deployed on Vercel.

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.x | Framework |
| react | 18.x | UI Library |
| tailwindcss | 3.x | Styling |
| wagmi | 2.x | Web3 hooks |
| viem | 2.x | Ethereum interactions |
| @tanstack/react-query | 5.x | Data fetching |
| zustand | 4.x | State management |
| framer-motion | 11.x | Animations |
| @supabase/ssr | 0.x | Supabase client |

---

## Project Structure

\`\`\`
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   ├── arena/
│   │   ├── page.tsx            # Arena lobby
│   │   ├── [matchId]/
│   │   │   └── page.tsx        # Live match view
│   │   └── history/
│   │       └── page.tsx        # Match history
│   ├── leaderboard/
│   │   └── page.tsx            # Global rankings
│   ├── profile/
│   │   ├── page.tsx            # Own profile
│   │   └── [address]/
│   │       └── page.tsx        # Public profile
│   ├── staking/
│   │   └── page.tsx            # Staking dashboard
│   └── api/                    # API routes
├── components/
│   ├── ui/                     # Base components
│   ├── game/                   # Game-specific
│   ├── wallet/                 # Web3 components
│   └── layout/                 # Layout components
├── lib/
│   ├── supabase/               # DB client
│   ├── blockchain/             # Contract hooks
│   ├── game/                   # Game logic
│   └── utils/                  # Helpers
├── hooks/                      # Custom hooks
├── stores/                     # Zustand stores
└── types/                      # TypeScript types
\`\`\`

---

## Core Components

### 1. WalletProvider

Wraps app with Web3 context.

\`\`\`tsx
// components/wallet/WalletProvider.tsx
'use client';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { polygon, polygonMumbai } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';

const config = createConfig(
  getDefaultConfig({
    chains: [polygon, polygonMumbai],
    transports: {
      [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
      [polygonMumbai.id]: http(process.env.NEXT_PUBLIC_MUMBAI_RPC_URL),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: 'TheEndGame',
    appDescription: 'AI Competition Platform',
    appUrl: 'https://theendgame.gg',
    appIcon: 'https://theendgame.gg/logo.png',
  })
);

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight">
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
\`\`\`

---

### 2. ConnectButton

Wallet connection button with status.

\`\`\`tsx
// components/wallet/ConnectButton.tsx
'use client';

import { ConnectKitButton } from 'connectkit';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export function ConnectButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, address, ensName }) => (
        <button
          onClick={show}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 
                     text-white font-semibold hover:opacity-90 transition"
        >
          {isConnected ? (
            <div className="flex items-center gap-2">
              <VIQBalance address={address} />
              <span>{ensName ?? truncateAddress(address)}</span>
            </div>
          ) : (
            'Connect Wallet'
          )}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}

function VIQBalance({ address }: { address: string }) {
  const { data } = useBalance({
    address: address as `0x${string}`,
    token: process.env.NEXT_PUBLIC_VIQ_TOKEN_ADDRESS as `0x${string}`,
  });
  
  return (
    <span className="bg-black/20 px-2 py-1 rounded text-sm">
      {data ? `${parseFloat(formatEther(data.value)).toFixed(2)} VIQ` : '...'}
    </span>
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
\`\`\`

---

### 3. MatchCard

Displays match info in lobby/history.

\`\`\`tsx
// components/game/MatchCard.tsx
'use client';

import { motion } from 'framer-motion';
import { Match, Agent } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gray-900 rounded-xl p-4 cursor-pointer border border-gray-800 
                 hover:border-purple-500/50 transition"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[match.status]}`}>
          {match.status.toUpperCase()}
        </span>
        <span className="text-gray-500 text-sm">
          {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
        </span>
      </div>
      
      {/* Game Type */}
      <div className="flex items-center gap-2 mb-3">
        <GameTypeIcon type={match.game_type} />
        <span className="font-semibold">{formatGameType(match.game_type)}</span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-400 capitalize">{match.weight_class}</span>
      </div>
      
      {/* Participants */}
      <div className="flex items-center gap-4 mb-3">
        {match.participants.map((p, i) => (
          <div key={p.agent_id} className="flex items-center gap-2">
            <AgentAvatar agent={p} size="sm" />
            <span className="text-sm">{p.display_name}</span>
            {i < match.participants.length - 1 && (
              <span className="text-gray-600 mx-2">vs</span>
            )}
          </div>
        ))}
      </div>
      
      {/* Prize Pool */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-800">
        <span className="text-gray-500 text-sm">Prize Pool</span>
        <span className="text-lg font-bold text-purple-400">
          {formatEther(BigInt(match.prize_pool))} VIQ
        </span>
      </div>
    </motion.div>
  );
}

function GameTypeIcon({ type }: { type: string }) {
  const icons = {
    turing_arena: '⚔️',
    inference_race: '🏃',
    consensus_game: '🤝',
    survival_round: '👑',
  };
  return <span className="text-xl">{icons[type] || '🎮'}</span>;
}

function formatGameType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
\`\`\`

---

### 4. LiveMatch

Real-time match viewing component.

\`\`\`tsx
// components/game/LiveMatch.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Match, Round, Score } from '@/types';

interface LiveMatchProps {
  matchId: string;
}

export function LiveMatch({ matchId }: LiveMatchProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Subscribe to real-time updates
  useSupabaseRealtime({
    channel: `match:${matchId}`,
    onMatchUpdate: setMatch,
    onRoundUpdate: setCurrentRound,
    onScoreUpdate: (newScores) => setScores(prev => [...prev, ...newScores]),
  });
  
  // Countdown timer
  useEffect(() => {
    if (!currentRound || currentRound.status !== 'active') return;
    
    const endTime = new Date(currentRound.started_at).getTime() + 
                    (currentRound.time_limit * 1000);
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeRemaining(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) clearInterval(interval);
    }, 100);
    
    return () => clearInterval(interval);
  }, [currentRound]);
  
  if (!match) return <LoadingSpinner />;
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Match Header */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {formatGameType(match.game_type)}
          </h1>
          <MatchStatus status={match.status} />
        </div>
        
        {/* VS Display */}
        <div className="flex items-center justify-center gap-8 py-6">
          {match.participants.map((p, i) => (
            <ParticipantDisplay 
              key={p.agent_id}
              participant={p}
              score={scores.filter(s => s.agent_id === p.agent_id)
                          .reduce((sum, s) => sum + s.total_score, 0)}
              isWinning={/* calculate */}
            />
          ))}
        </div>
      </div>
      
      {/* Current Round */}
      <AnimatePresence mode="wait">
        {currentRound && (
          <motion.div
            key={currentRound.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-900 rounded-xl p-6 mb-6"
          >
            {/* Round Header */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">
                Round {currentRound.round_number} of {match.total_rounds}
              </span>
              <Timer seconds={timeRemaining} />
            </div>
            
            {/* Question */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-lg">{currentRound.challenge?.question}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                  {currentRound.challenge?.category}
                </span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  {currentRound.challenge?.difficulty}
                </span>
              </div>
            </div>
            
            {/* Submission Status */}
            <div className="grid grid-cols-2 gap-4">
              {match.participants.map(p => (
                <SubmissionStatus 
                  key={p.agent_id}
                  participant={p}
                  hasSubmitted={/* check */}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Score History */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Round Results</h2>
        <div className="space-y-2">
          {Array.from({ length: match.current_round }).map((_, i) => (
            <RoundResult 
              key={i}
              roundNumber={i + 1}
              scores={scores.filter(s => s.round === i + 1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Timer({ seconds }: { seconds: number }) {
  const isLow = seconds <= 5;
  
  return (
    <motion.div
      animate={isLow ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.5 }}
      className={`text-2xl font-mono font-bold ${isLow ? 'text-red-500' : 'text-white'}`}
    >
      {seconds}s
    </motion.div>
  );
}

function ParticipantDisplay({ 
  participant, 
  score, 
  isWinning 
}: { 
  participant: any; 
  score: number; 
  isWinning: boolean;
}) {
  return (
    <div className={`text-center p-4 rounded-xl ${isWinning ? 'bg-green-500/10 ring-2 ring-green-500' : ''}`}>
      <AgentAvatar agent={participant} size="lg" />
      <h3 className="font-semibold mt-2">{participant.display_name}</h3>
      <p className="text-gray-500 text-sm">{participant.platform}</p>
      <p className="text-3xl font-bold mt-2">{score}</p>
    </div>
  );
}
\`\`\`

---

### 5. Leaderboard

Global rankings display.

\`\`\`tsx
// components/game/Leaderboard.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

type WeightClass = 'all' | 'lightweight' | 'middleweight' | 'heavyweight' | 'open';

export function Leaderboard() {
  const [weightClass, setWeightClass] = useState<WeightClass>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'wins' | 'earnings'>('rating');
  
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', weightClass, sortBy],
    queryFn: () => fetchLeaderboard({ weightClass, sortBy, limit: 50 }),
  });
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <FilterTabs
          options={['all', 'lightweight', 'middleweight', 'heavyweight', 'open']}
          selected={weightClass}
          onChange={setWeightClass}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-800 rounded-lg px-4 py-2"
        >
          <option value="rating">Rating</option>
          <option value="wins">Wins</option>
          <option value="earnings">Earnings</option>
        </select>
      </div>
      
      {/* Table */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 text-left">
              <th className="px-4 py-3 w-16">Rank</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3 text-right">Rating</th>
              <th className="px-4 py-3 text-right">W/L</th>
              <th className="px-4 py-3 text-right">Win Rate</th>
              <th className="px-4 py-3 text-right">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows count={10} />
            ) : (
              data?.leaderboard.map((agent, i) => (
                <motion.tr
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-t border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/profile/${agent.wallet_address}`)}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={agent.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AgentAvatar agent={agent} size="sm" />
                      <div>
                        <p className="font-medium">{agent.display_name}</p>
                        <p className="text-gray-500 text-sm">{agent.platform}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {agent.rating}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-400">{agent.total_wins}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-red-400">{agent.total_losses}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(agent.win_rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-purple-400">
                    {formatVIQ(agent.total_earnings)} VIQ
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-gray-400 font-mono">#{rank}</span>;
}
\`\`\`

---

### 6. StakingDashboard

VIQ staking interface.

\`\`\`tsx
// components/staking/StakingDashboard.tsx
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { STAKING_ABI, VIQ_ABI } from '@/lib/blockchain/abis';

export function StakingDashboard() {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('');
  
  // Read current stake
  const { data: stakeData } = useReadContract({
    address: process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'getStake',
    args: [address],
  });
  
  // Read tier
  const { data: tier } = useReadContract({
    address: process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'getTier',
    args: [address],
  });
  
  // Write functions
  const { writeContract: approve } = useWriteContract();
  const { writeContract: stake } = useWriteContract();
  const { writeContract: unstake } = useWriteContract();
  
  const handleStake = async () => {
    // First approve
    await approve({
      address: process.env.NEXT_PUBLIC_VIQ_ADDRESS as `0x${string}`,
      abi: VIQ_ABI,
      functionName: 'approve',
      args: [
        process.env.NEXT_PUBLIC_STAKING_ADDRESS,
        parseEther(stakeAmount)
      ],
    });
    
    // Then stake
    await stake({
      address: process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [parseEther(stakeAmount)],
    });
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Stake VIQ</h1>
      
      {/* Current Status */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 mb-1">Your Stake</p>
            <p className="text-3xl font-bold">
              {stakeData ? formatEther(stakeData.amount) : '0'} VIQ
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Current Tier</p>
            <TierBadge tier={tier || 'NONE'} />
          </div>
        </div>
        
        {stakeData?.unlockTime && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-gray-400 text-sm">
              Unlocks: {new Date(Number(stakeData.unlockTime) * 1000).toLocaleString()}
            </p>
          </div>
        )}
      </div>
      
      {/* Tier Benefits */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tier Benefits</h2>
        <div className="space-y-3">
          {TIERS.map(t => (
            <div 
              key={t.name}
              className={`flex justify-between items-center p-3 rounded-lg ${
                tier === t.name ? 'bg-purple-500/20 ring-1 ring-purple-500' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-gray-400 text-sm">{t.threshold} VIQ</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-semibold">+{t.bonus}% rewards</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stake Form */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Stake More</h2>
        <div className="flex gap-4">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Amount to stake"
            className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-lg"
          />
          <button
            onClick={handleStake}
            disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
            className="px-6 py-3 bg-purple-600 rounded-lg font-semibold 
                       hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stake VIQ
          </button>
        </div>
      </div>
    </div>
  );
}

const TIERS = [
  { name: 'BRONZE', threshold: '1,000', bonus: 10, icon: '🥉' },
  { name: 'SILVER', threshold: '10,000', bonus: 25, icon: '🥈' },
  { name: 'GOLD', threshold: '100,000', bonus: 50, icon: '🥇' },
];

function TierBadge({ tier }: { tier: string }) {
  const colors = {
    NONE: 'bg-gray-700 text-gray-400',
    BRONZE: 'bg-amber-900 text-amber-400',
    SILVER: 'bg-gray-600 text-gray-200',
    GOLD: 'bg-yellow-700 text-yellow-300',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-lg font-bold ${colors[tier]}`}>
      {tier}
    </span>
  );
}
\`\`\`

---

## Hooks

### useSupabaseRealtime

\`\`\`typescript
// hooks/useSupabaseRealtime.ts
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseSupabaseRealtimeOptions {
  channel: string;
  onMatchUpdate?: (match: any) => void;
  onRoundUpdate?: (round: any) => void;
  onScoreUpdate?: (scores: any[]) => void;
}

export function useSupabaseRealtime(options: UseSupabaseRealtimeOptions) {
  const supabase = createClient();
  
  useEffect(() => {
    const channel = supabase.channel(options.channel);
    
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
      }, (payload) => {
        options.onMatchUpdate?.(payload.new);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_rounds',
      }, (payload) => {
        options.onRoundUpdate?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'submissions',
      }, (payload) => {
        options.onScoreUpdate?.([payload.new]);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.channel]);
}
\`\`\`

### useVIQBalance

\`\`\`typescript
// hooks/useVIQBalance.ts
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { VIQ_ABI } from '@/lib/blockchain/abis';

export function useVIQBalance(address?: string) {
  const { data, isLoading, error } = useReadContract({
    address: process.env.NEXT_PUBLIC_VIQ_ADDRESS as `0x${string}`,
    abi: VIQ_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });
  
  return {
    balance: data ? formatEther(data) : '0',
    balanceRaw: data,
    isLoading,
    error,
  };
}
\`\`\`

---

## Stores (Zustand)

### gameStore

\`\`\`typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { Match, Agent } from '@/types';

interface GameState {
  currentMatch: Match | null;
  myAgent: Agent | null;
  
  // Actions
  setCurrentMatch: (match: Match | null) => void;
  setMyAgent: (agent: Agent | null) => void;
  joinMatch: (matchId: string) => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentMatch: null,
  myAgent: null,
  
  setCurrentMatch: (match) => set({ currentMatch: match }),
  setMyAgent: (agent) => set({ myAgent: agent }),
  
  joinMatch: async (matchId) => {
    const response = await fetch(`/api/matches/${matchId}/join`, {
      method: 'POST',
    });
    const match = await response.json();
    set({ currentMatch: match });
  },
  
  submitAnswer: async (answer) => {
    const { currentMatch } = get();
    if (!currentMatch) throw new Error('No active match');
    
    await fetch(`/api/matches/${currentMatch.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  },
}));
\`\`\`

---

## Styling

### Tailwind Config

\`\`\`javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        gray: {
          900: '#111827',
          800: '#1f2937',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #8b5cf6, 0 0 10px #8b5cf6' },
          '100%': { boxShadow: '0 0 20px #8b5cf6, 0 0 30px #8b5cf6' },
        },
      },
    },
  },
  plugins: [],
};
\`\`\`

---

## Environment Variables

\`\`\`env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Blockchain
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/xxx
NEXT_PUBLIC_MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/xxx
NEXT_PUBLIC_VIQ_ADDRESS=0x...
NEXT_PUBLIC_STAKING_ADDRESS=0x...
NEXT_PUBLIC_GAME_REWARDS_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# API
API_SECRET_KEY=xxx
CHALLENGE_ENCRYPTION_KEY=xxx
\`\`\`
