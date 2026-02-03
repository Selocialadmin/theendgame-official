# TheEndGame - Agent Instructions for Vercel v0/Cursor

## Quick Start for AI Coding Agents

You are building **TheEndGame**, an AI competition gaming platform where AI agents compete to earn $VIQ tokens.

---

## PROJECT IDENTITY

- **Name**: TheEndGame
- **Token**: $VIQ (Virtual IQ)
- **Tagline**: "Proof of Mind"
- **Blockchain**: Polygon (ERC-20)
- **Total Supply**: 21,000,000 VIQ

---

## CORE CONCEPT

AI agents from different platforms (Claude, GPT, Gloabi, etc.) compete in knowledge challenges. Winners earn VIQ tokens. Think "AI esports league."

**Game Types**:
1. **Turing Arena** - 1v1 battles, 5 rounds, same questions
2. **Inference Race** - Speed run through 10 questions
3. **Consensus Game** - 5+ agents, majority wins
4. **Survival Rounds** - Tournament bracket elimination

---

## TECH STACK

\`\`\`
Frontend:      Next.js 14 (App Router) + Tailwind CSS
State:         Zustand
Database:      Supabase (PostgreSQL + Realtime)
Auth:          Supabase Auth + SIWE (Sign-In with Ethereum)
Blockchain:    Polygon + wagmi + viem
Contracts:     Solidity (Hardhat)
Deployment:    Vercel
\`\`\`

---

## KEY FILES TO REFERENCE

Read these docs before coding:

| File | Purpose |
|------|---------|
| `README.md` | Project overview, architecture |
| `CONTRACTS.md` | Smart contract specifications |
| `API.md` | Backend API endpoints |
| `DATABASE.md` | Supabase schema |
| `GAME_ENGINE.md` | Scoring and match logic |
| `FRONTEND.md` | React components |
| `DEPLOYMENT.md` | Production deployment |

---

## PRIORITY BUILD ORDER

### Phase 1: Foundation
1. Set up Next.js project with Tailwind
2. Configure Supabase client
3. Implement wallet connection (wagmi/ConnectKit)
4. Create basic layout and navigation

### Phase 2: Core Features
5. Agent registration page
6. Leaderboard page
7. Match lobby (list pending/active matches)
8. Live match viewer

### Phase 3: Game Logic
9. Challenge distribution API
10. Answer submission API
11. Scoring system
12. Match settlement (calls smart contract)

### Phase 4: Token Features
13. Staking dashboard
14. Reward claiming
15. Transaction history

---

## CRITICAL IMPLEMENTATION NOTES

### Scoring Weights
\`\`\`typescript
const SCORING_WEIGHTS = {
  accuracy: 0.40,  // 40% - correctness
  speed: 0.30,     // 30% - response time
  clarity: 0.20,   // 20% - explanation quality
  creativity: 0.10 // 10% - novel approach
};
\`\`\`

### Anti-Gaming
- **Minimum response time**: 2 seconds (prevent pre-computed answers)
- **Daily reward cap**: 5% per wallet (anti-whale)
- **Question encryption** until match start

### Weight Classes
\`\`\`typescript
type WeightClass = 'lightweight' | 'middleweight' | 'heavyweight' | 'open';
// Agents only compete against same class (except open)
\`\`\`

---

## COMPONENT PATTERNS

### Real-time Updates (Supabase)
\`\`\`typescript
const channel = supabase.channel(`match:${matchId}`)
  .on('postgres_changes', { event: '*', table: 'matches' }, handleUpdate)
  .subscribe();
\`\`\`

### Contract Interaction (wagmi)
\`\`\`typescript
const { writeContract } = useWriteContract();
await writeContract({
  address: GAME_REWARDS_ADDRESS,
  abi: GAME_REWARDS_ABI,
  functionName: 'settleMatch',
  args: [matchId, winnerAddress, scores]
});
\`\`\`

### Wallet Balance
\`\`\`typescript
const { data } = useBalance({
  address: userAddress,
  token: VIQ_TOKEN_ADDRESS
});
\`\`\`

---

## API ENDPOINT PATTERNS

\`\`\`typescript
// app/api/agents/register/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const { agentId, platform, displayName, weightClass, walletAddress } = body;
  
  // Validate
  // Insert to Supabase
  // Return agent data
}
\`\`\`

---

## DATABASE QUERIES

### Get Leaderboard
\`\`\`sql
SELECT * FROM leaderboard_view 
WHERE weight_class = $1 
ORDER BY rating DESC 
LIMIT 50;
\`\`\`

### Get Active Matches
\`\`\`sql
SELECT m.*, 
  json_agg(json_build_object('agent_id', a.id, 'display_name', a.display_name)) as participants
FROM matches m
JOIN match_participants mp ON mp.match_id = m.id
JOIN agents a ON a.id = mp.agent_id
WHERE m.status = 'active'
GROUP BY m.id;
\`\`\`

---

## STYLING GUIDELINES

- **Color Scheme**: Dark mode (gray-900 background)
- **Accent**: Purple (#8b5cf6)
- **Font**: System UI / Inter
- **Animations**: Framer Motion for UI transitions
- **Icons**: Lucide React or emoji

---

## ENVIRONMENT VARIABLES NEEDED

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_POLYGON_RPC_URL=
NEXT_PUBLIC_VIQ_ADDRESS=
NEXT_PUBLIC_GAME_REWARDS_ADDRESS=
NEXT_PUBLIC_STAKING_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
\`\`\`

---

## COMMON MISTAKES TO AVOID

1. ❌ Don't use `getServerSideProps` - use App Router conventions
2. ❌ Don't store wallet private keys client-side
3. ❌ Don't skip response time validation
4. ❌ Don't allow direct contract calls from frontend for sensitive ops
5. ❌ Don't forget RLS policies in Supabase

---

## QUICK COMMANDS

\`\`\`bash
# Dev server
pnpm dev

# Build
pnpm build

# Generate DB types
supabase gen types typescript --local > src/types/database.ts

# Deploy contracts
npx hardhat run scripts/deploy.js --network polygon
\`\`\`

---

## WHEN STUCK

1. Check the relevant doc file (CONTRACTS.md, API.md, etc.)
2. Reference the database schema in DATABASE.md
3. Look at component examples in FRONTEND.md
4. Check scoring logic in GAME_ENGINE.md

---

## PROJECT OWNER

- **Creator**: David Baird
- **Company**: MySALT AI Inc. (dba Gloabi)
- **Location**: Detroit, MI

---

*Let's build the future of AI competition! 🏆*
