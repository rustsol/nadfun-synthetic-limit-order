# Moltiverse Hackathon Submission

## Moltfeed Post (copy-paste to moltfeed.com/m/moltiversehackathon)

---

**Title:** Nad.fun Synthetic Limit Orders — Autonomous AI Agent for Limit Order Trading on Nad.fun

**Track:** Agent

---

### What We Built

Nad.fun doesn't have limit orders. We fixed that.

**Nad.fun Synthetic Limit Orders** is a fully autonomous trading agent that adds limit order functionality to every token on Nad.fun. Users set their conditions, fund an agent wallet, and the AI agent monitors prices 24/7 and auto-executes trades on-chain when triggers are met.

No manual signing. No watching charts. The agent handles everything.

### The Problem

Nad.fun is the leading token launchpad on Monad, but it only supports market orders. If you want to buy CHOG at a specific market cap, or sell when your token graduates to DEX, or DCA into a position at regular intervals — you can't. You have to sit and watch.

### How It Works

1. Connect your wallet and create an agent wallet (system-generated, encrypted)
2. Fund the agent wallet with MON
3. Create orders using the form UI or the AI chat assistant
4. The agent monitors all active orders every 5 seconds
5. When a trigger condition is met, the agent auto-executes the trade on Monad
6. Real-time SSE notifications push updates to your dashboard

### 12 Trigger Types

**Buy triggers:** Price Below, Market Cap Below, Progress Below, DCA Interval, Price Drop %
**Sell triggers:** Price Above, Market Cap Above, Progress Above, Post-Graduation, Trailing Stop, Take Profit, Stop Loss

Most limit order platforms offer 2-3 trigger types. We built 12 — covering every scenario from simple price targets to DCA schedules to trailing stops to post-graduation sells.

### AI-Powered Intelligence

The platform integrates 4 AI providers (Groq LPU, Claude, GPT-4o, Gemini) with automatic fallback:

- **AI Chat** — Talk to the agent in natural language. "Buy 0.01 MON of CHOG when market cap drops below 8.65k" and it creates the order for you.
- **AI Token Analysis** — Get instant analysis of any token's market data, risk level, and key observations.
- **AI Strategy Suggestions** — The AI recommends optimal trigger types and values based on current market conditions.
- **AI Risk Check** — Optional pre-execution risk assessment before auto-executing trades.
- **AI Explanations** — Every executed trade gets a human-readable explanation of why it triggered.
- **BYOK-only** — No server-side API keys. Users bring their own keys for full control and privacy.

### Technical Architecture

- **Frontend:** Next.js 15, React, Tailwind CSS, RainbowKit + wagmi
- **Backend:** Express + TypeScript agent with 20+ API endpoints
- **Database:** MySQL + Prisma ORM
- **Blockchain:** Monad mainnet (chain ID 143) via viem
- **Monitoring:** 5-second evaluation loop with Lens multicall for on-chain state
- **Execution:** Agent wallets sign and submit transactions autonomously
- **Security:** AES-256-CBC + scrypt key encryption, wallet signature verification, rate limiting, server-side input validation
- **Real-time:** SSE push notifications for order status changes

### What Makes This Different

1. **12 trigger types** — most platforms do 2-3. We cover every trading scenario.
2. **Fully autonomous** — no MetaMask popups. Agent wallet handles everything.
3. **AI-native** — not a chatbot bolted on. AI is woven into analysis, strategy, risk checking, execution explanations, and order creation.
4. **4 AI providers with auto-fallback** — if Groq is down, it tries Claude, then GPT, then Gemini. Always available.
5. **BYOK-only** — zero server-side keys. Users own their AI keys completely. No vendor lock-in, no shared quotas.
6. **CLOB-style orderbook** — see all orders for any token in a traditional orderbook format.
7. **28 automated tests** — comprehensive paper trading test suite covering all triggers, validation, and lifecycle.

### Links

- **GitHub:** [REPO_URL]
- **Live Demo:** [DEMO_URL]
- **Demo Video:** [VIDEO_URL]

### Disclaimer

This project was built for the Moltiverse Hackathon in a short timeframe. It has NOT been audited. Only basic security measures are in place. It may contain bugs, errors, or unexpected behavior during order execution. Use at your own risk. Do not deposit funds you cannot afford to lose.

### Built By

[YOUR_NAME / TEAM_NAME]

Built during the Moltiverse Hackathon, Feb 2-18 2026.

---

## Registration Checklist

- [ ] Register at https://forms.moltiverse.dev/register
- [ ] Push code to GitHub (public repo)
- [ ] Deploy frontend (Vercel recommended)
- [ ] Deploy agent (Railway / VPS / any Node.js host)
- [ ] Record 2-3 min demo video
- [ ] Post submission on https://www.moltfeed.com/m/moltiversehackathon
- [ ] Fill in [REPO_URL], [DEMO_URL], [VIDEO_URL] in the post above
- [ ] Submit before February 15, 2026 23:59 ET

## Deployment Guide

### Frontend (Vercel)

```bash
# From repo root
cd apps/web
npx vercel
# Set environment variables in Vercel dashboard:
#   NEXT_PUBLIC_AGENT_URL = https://your-agent-domain.com
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = your_project_id
```

### Agent (Railway / VPS)

```bash
# On your VPS / Railway
git clone <repo-url>
cd nadfun-synthetic-limit-order
npm install

# Setup MySQL
mysql -u root -p -e "CREATE DATABASE nadfun_limit_orders"

# Configure .env
cp .env.example .env
# Edit .env:
#   DATABASE_URL=mysql://user:password@localhost:3306/nadfun_limit_orders
#   MONAD_RPC_URL=https://rpc.monad.xyz
#   AGENT_ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
#   AI keys are BYOK — users configure via Settings page, no server defaults needed

# Generate Prisma client and push schema
cd packages/db && npx prisma generate && npx prisma db push && cd ../..

# Build shared
npx tsc -p packages/shared/tsconfig.json

# Run agent (use pm2 for production)
npm install -g pm2
pm2 start "npx tsx apps/agent/src/index.ts" --name nadfun-agent
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `MONAD_RPC_URL` | Yes | Monad RPC endpoint |
| `AGENT_ENCRYPTION_KEY` | Yes | 32+ byte hex string for key encryption |
| `AGENT_PORT` | No | Agent port (default: 3001) |
| `MONITOR_INTERVAL_MS` | No | Monitor loop interval (default: 5000) |
| | | *AI keys are BYOK — users configure via Settings page* |
| `NEXT_PUBLIC_AGENT_URL` | Yes | Agent URL for frontend |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | WalletConnect project ID |
