# Synthetic Order Flow

### Autonomous AI-Agent Powered Limit Orders for Tokens on Monad

> Built for the [Moltiverse Hackathon](https://moltiverse.dev) | Agent Track

> **WARNING: This project was built for a hackathon in a short timeframe. It has NOT been audited. Only basic security measures are in place. It may contain bugs, errors, or unexpected behavior during order execution. Use at your own risk. Do not deposit funds you cannot afford to lose.**

---

## The Problem

[nad.fun](https://nad.fun) is the leading meme token launchpad on Monad with bonding curve mechanics, but it **does not support limit orders**. Traders must manually watch prices and execute at the right moment, or miss their target entirely.

## The Solution

A fully autonomous limit order platform that sits on top of nad.fun. Each user gets a dedicated **AI agent wallet** that continuously monitors market conditions and **auto-executes trades on-chain** when user-defined triggers are met.

No manual signing. No babysitting charts. Set your conditions, fund your agent wallet, and walk away.

## Key Features

### 12 Trigger Types
| Trigger | Direction | What It Does |
|---------|-----------|-------------|
| `PRICE_BELOW` | BUY | Buy when price drops to target |
| `MCAP_BELOW` | BUY | Buy when market cap drops below target |
| `PROGRESS_BELOW` | BUY | Buy when bonding curve progress drops |
| `DCA_INTERVAL` | BUY | Recurring buys at fixed intervals (1m to 24h) |
| `PRICE_DROP_PCT` | BUY | Buy after X% drop from reference price |
| `PRICE_ABOVE` | SELL | Sell when price rises to target |
| `MCAP_ABOVE` | SELL | Sell when market cap exceeds target |
| `PROGRESS_ABOVE` | SELL | Sell when bonding curve progress rises |
| `POST_GRADUATION` | SELL | Sell when token graduates to DEX |
| `TRAILING_STOP` | SELL | Sell after X% drop from peak price |
| `TAKE_PROFIT` | SELL | Sell after X% gain from entry |
| `STOP_LOSS` | SELL | Sell after X% loss from entry |

### AI-Powered Trading Intelligence
- **4 AI providers** with auto-rotation fallback: Groq (LPU), Claude, GPT-4o, Gemini
- **BYOK-only**: users bring their own API keys via Settings page (no server-side defaults)
- **AI Chat** (`/chat`) - conversational trading assistant that can create and cancel orders
- **AI Token Analysis** - on-demand market data analysis for any token
- **AI Strategy Suggestions** - AI recommends optimal trigger type/value
- **AI Risk Check** - opt-in pre-execution risk assessment
- **AI Explanations** - human-readable explanations of every executed trade

### Platform Features
- **Auto-execution** via encrypted agent wallets (no manual signing)
- **Real-time SSE** push notifications from agent to frontend
- **CLOB-style orderbook** view per token
- **nad.fun market data** integration (price, mcap, volume, holders, ATH)
- **Encrypted agent keys** (AES-256-CBC + scrypt, random per-key salt)
- **Wallet signature verification** for sensitive operations
- **Rate limiting** on all endpoints
- **Server-side input validation** on all order parameters

## Architecture

```
User Wallet (MetaMask / RainbowKit)
    |
    v
[Next.js Frontend :3000]
    |                           Pages:
    |                           / .............. Dashboard
    |                           /create ........ Create Order
    |                           /orders ........ Manage Orders
    |                           /orderbook/[t] . CLOB Orderbook
    |                           /chat .......... AI Assistant
    |                           /settings ...... Agent Wallet & AI Config
    v  REST API + SSE
[Express Agent :3001]
    |-- Monitor Loop (5s interval)
    |   |-- Fetch on-chain state (Lens multicall)
    |   |-- Fetch nad.fun API data (price, mcap, volume)
    |   |-- Evaluate 12 trigger conditions
    |   |-- AI Risk Check (opt-in, fail-open)
    |   +-- Auto-execute via agent wallet
    |
    |-- AI Layer (Groq -> Claude -> GPT -> Gemini fallback)
    |   |-- Token Analysis
    |   |-- Strategy Suggestions
    |   |-- Chat (with ACTION line parsing)
    |   +-- Post-execution Explanations
    |
    |-- SSE Push Notifications
    +-- MySQL / Prisma ORM
           |
           v
    [Monad Blockchain (Chain ID: 143)]
    |-- BondingCurveRouter (pre-graduation)
    +-- DexRouter (post-graduation)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React, Tailwind CSS, RainbowKit, wagmi, viem |
| **Backend** | Express, TypeScript, tsx |
| **Database** | MySQL, Prisma ORM |
| **Blockchain** | Monad (chain ID 143), viem for contract interaction |
| **AI** | Groq (LPU), Anthropic Claude, OpenAI GPT-4o, Google Gemini |
| **Architecture** | Monorepo with npm workspaces |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd nadfun-synthetic-limit-order
npm install

# Setup database
mysql -u root -e "CREATE DATABASE nadfun_limit_orders"
cd packages/db && npx prisma generate && npx prisma db push && cd ../..

# Configure environment
cp .env.example .env
# Edit .env with your RPC URL, AI keys, encryption key

# Build shared package
npx tsc -p packages/shared/tsconfig.json

# Run (two terminals)
npx tsx apps/agent/src/index.ts    # Agent API (port 3001)
cd apps/web && npx next dev        # Frontend (port 3000)
```

## Project Structure

```
nadfun-synthetic-limit-order/
  packages/
    shared/       # Types, ABIs, constants, price utils
    db/           # Prisma schema & generated client
  apps/
    agent/        # Backend: monitor loop, evaluator, executor, AI, API
      src/
        ai/           # 4 providers + fallback + prompts + risk-check
        db/           # Orders, accounts, AI config DB operations
        events/       # SSE push notifications
        execution/    # Transaction building, signing, slippage guard
        monitor/      # Evaluator, state fetcher, quote fetcher, loop
        server.ts     # Express API (20+ endpoints)
        index.ts      # Entry point
    web/          # Frontend: Next.js 15 dashboard
      src/
        app/          # Pages: home, create, orders, orderbook, chat, settings
        components/   # Order form, token info, chat UI, orderbook
        lib/          # API client, hooks, utils
  scripts/
    paper-trade-test.ts  # Comprehensive test script (28 tests, all triggers)
```

## How It Works

1. **Connect wallet** - MetaMask via RainbowKit
2. **Create agent wallet** - system generates an encrypted wallet for auto-execution
3. **Fund agent wallet** - send MON to cover gas + trade amounts
4. **Create orders** - via the form UI or AI chat assistant
5. **Monitor loop** - agent checks all active orders every 5 seconds
6. **Trigger evaluation** - deterministic comparison against on-chain state
7. **Auto-execute** - agent wallet signs and submits the transaction on Monad
8. **Real-time updates** - SSE pushes status changes to frontend instantly

## Contract Addresses (Monad Mainnet)

| Contract | Address |
|----------|---------|
| Lens | `0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea` |
| BondingCurveRouter | `0x6F6B8F1a20703309951a5127c45B49b1CD981A22` |
| DexRouter | `0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137` |
| BondingCurve | `0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE` |

## Security

- Agent wallet private keys encrypted with **AES-256-CBC + scrypt** using random per-key salt
- Wallet signature verification (ECDSA + 5-minute expiry) for sensitive operations
- Server-side validation on all order parameters (address format, direction, trigger type, amounts, expiry, slippage range)
- Rate limiting on all endpoints with stricter limits on sensitive operations
- AI risk check is opt-in and fail-open: deterministic logic always works, AI is a safety layer on top

## Testing

```bash
# Run the comprehensive paper trading test (tests all 12 triggers + validation + lifecycle)
npx tsx scripts/paper-trade-test.ts
```

## License

MIT
