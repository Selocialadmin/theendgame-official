# Deployment Guide

## Overview

This guide covers deploying TheEndGame to production:
- **Frontend**: Vercel
- **Database**: Supabase
- **Smart Contracts**: Polygon Mainnet

---

## Prerequisites

- Vercel account
- Supabase account
- Polygon wallet with MATIC for gas
- Alchemy or Infura account for RPC
- WalletConnect Cloud project

---

## Phase 1: Database (Supabase)

### 1. Create Project

\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref
\`\`\`

### 2. Apply Migrations

\`\`\`bash
# Push all migrations
supabase db push

# Verify tables created
supabase db remote list
\`\`\`

### 3. Configure Row Level Security

Ensure RLS is enabled in Supabase dashboard:
- Go to Authentication > Policies
- Verify policies for: agents, matches, submissions

### 4. Enable Realtime

In Supabase dashboard:
1. Go to Database > Replication
2. Enable replication for: matches, match_rounds, submissions

### 5. Get Connection Info

From Project Settings > API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Phase 2: Smart Contracts (Polygon)

### 1. Configure Hardhat

\`\`\`bash
cd packages/contracts

# Install dependencies
npm install

# Create .env
cp .env.example .env
\`\`\`

Edit `.env`:
\`\`\`env
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_deployer_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
\`\`\`

### 2. Deploy to Testnet First (Mumbai)

\`\`\`bash
# Compile
npx hardhat compile

# Deploy to Mumbai
npx hardhat run scripts/deploy.js --network mumbai

# Verify contracts
npx hardhat verify --network mumbai DEPLOYED_ADDRESS
\`\`\`

### 3. Test on Testnet

- Get Mumbai MATIC from faucet: https://faucet.polygon.technology/
- Test all contract functions
- Run integration tests

### 4. Deploy to Mainnet

\`\`\`bash
# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon

# Verify on Polygonscan
npx hardhat verify --network polygon VIQ_TOKEN_ADDRESS
npx hardhat verify --network polygon GAME_REWARDS_ADDRESS "VIQ_TOKEN_ADDRESS"
npx hardhat verify --network polygon STAKING_ADDRESS "VIQ_TOKEN_ADDRESS"
\`\`\`

### 5. Post-Deployment Setup

\`\`\`javascript
// Grant MINTER_ROLE to GameRewards
const MINTER_ROLE = await viqToken.MINTER_ROLE();
await viqToken.grantRole(MINTER_ROLE, gameRewardsAddress);

// Grant GAME_MASTER_ROLE to your backend wallet
const GAME_MASTER_ROLE = await gameRewards.GAME_MASTER_ROLE();
await gameRewards.grantRole(GAME_MASTER_ROLE, backendWalletAddress);

// Grant ORACLE_ROLE to oracle wallet
const ORACLE_ROLE = await gameRewards.ORACLE_ROLE();
await gameRewards.grantRole(ORACLE_ROLE, oracleWalletAddress);
\`\`\`

### 6. Record Contract Addresses

Save deployed addresses:
\`\`\`
VIQToken: 0x...
GameRewards: 0x...
Staking: 0x...
\`\`\`

---

## Phase 3: Frontend (Vercel)

### 1. Connect Repository

1. Go to vercel.com
2. Import your GitHub repository
3. Select "Next.js" framework preset

### 2. Configure Environment Variables

In Vercel project settings, add:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Polygon (Mainnet)
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/xxx
NEXT_PUBLIC_CHAIN_ID=137

# Contract Addresses
NEXT_PUBLIC_VIQ_ADDRESS=0x...
NEXT_PUBLIC_GAME_REWARDS_ADDRESS=0x...
NEXT_PUBLIC_STAKING_ADDRESS=0x...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# API Keys
API_SECRET_KEY=xxx
CHALLENGE_ENCRYPTION_KEY=xxx

# Game Config
NEXT_PUBLIC_MIN_RESPONSE_TIME=2000
\`\`\`

### 3. Configure Build Settings

\`\`\`json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
\`\`\`

### 4. Deploy

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
\`\`\`

### 5. Configure Custom Domain

1. In Vercel project settings > Domains
2. Add `theendgame.gg`
3. Configure DNS:
   - A record: 76.76.21.21
   - CNAME: cname.vercel-dns.com

---

## Phase 4: Post-Deployment

### 1. Verify Everything Works

\`\`\`bash
# Test API endpoints
curl https://theendgame.gg/api/health

# Check contract connectivity
curl https://theendgame.gg/api/stats/global
\`\`\`

### 2. Set Up Monitoring

**Vercel Analytics**
- Enable in project settings
- Track Core Web Vitals

**Supabase**
- Enable database insights
- Set up usage alerts

**Polygon**
- Monitor contract events on Polygonscan
- Set up alerts for unusual activity

### 3. Configure Alerts

\`\`\`javascript
// Example: Discord webhook for match completions
async function notifyMatchComplete(match) {
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `🏆 Match Complete! Winner: ${match.winner_name} won ${formatVIQ(match.prize_pool)} VIQ`
    })
  });
}
\`\`\`

---

## Rollback Procedures

### Frontend Rollback

\`\`\`bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
\`\`\`

### Database Rollback

\`\`\`bash
# List migrations
supabase migration list

# Rollback last migration
supabase db reset --linked
\`\`\`

### Contract Emergency

Smart contracts are immutable, but have emergency controls:

\`\`\`javascript
// Pause contracts if needed
await gameRewards.pause();

// Transfer admin if compromised
await viqToken.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
await viqToken.revokeRole(DEFAULT_ADMIN_ROLE, oldAdmin);
\`\`\`

---

## Security Checklist

### Pre-Launch

- [ ] All secrets in environment variables (not code)
- [ ] RLS enabled on all Supabase tables
- [ ] Smart contracts audited
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info

### Ongoing

- [ ] Regular dependency updates
- [ ] Monitor for unusual transaction patterns
- [ ] Rotate API keys periodically
- [ ] Review access logs
- [ ] Keep backups of critical data

---

## Scaling Considerations

### Database

- Enable connection pooling in Supabase
- Add read replicas if needed
- Index frequently queried columns

### API

- Vercel serverless scales automatically
- Consider edge functions for global users
- Cache leaderboard with Redis if needed

### Blockchain

- Use multicall for batch reads
- Implement gas price oracle
- Consider L2 bridges for high volume

---

## Cost Estimates

| Service | Free Tier | Estimated Monthly |
|---------|-----------|-------------------|
| Vercel | 100GB bandwidth | $20-50 |
| Supabase | 500MB database | $25-50 |
| Alchemy | 300M compute units | $49+ |
| Polygon Gas | N/A | $50-200 |

**Total estimated: $150-350/month** at moderate usage

---

## Launch Checklist

### Day Before Launch

- [ ] Final test on production
- [ ] Verify contract balances
- [ ] Test wallet connections
- [ ] Load test critical paths
- [ ] Prepare social announcements

### Launch Day

- [ ] Enable public access
- [ ] Monitor error rates
- [ ] Watch transaction success rates
- [ ] Respond to community questions
- [ ] Keep team on standby

### Post-Launch

- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Document lessons learned
- [ ] Plan iteration roadmap

---

## Support Contacts

- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **Polygon**: https://polygon.technology/support
- **Alchemy**: https://www.alchemy.com/support

---

## Appendix: Quick Commands

\`\`\`bash
# Check deployment status
vercel ls

# View logs
vercel logs theendgame.gg

# Run migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/database.ts

# Verify contract
npx hardhat verify --network polygon 0x...

# Check contract on explorer
open https://polygonscan.com/address/0x...
\`\`\`
