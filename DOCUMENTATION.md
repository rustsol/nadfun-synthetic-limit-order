# Nad.fun Synthetic Limit Order Platform

## Table of Contents

- [Project Context](#project-context)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Creating an Agent Wallet](#creating-an-agent-wallet)
- [AI Agent Configuration](#ai-agent-configuration)
- [AI Agent Capabilities](#ai-agent-capabilities)
- [AI Providers](#ai-providers)
- [Trigger Types](#trigger-types)
  - [BUY Triggers](#buy-triggers)
  - [SELL Triggers](#sell-triggers)
- [Order Lifecycle](#order-lifecycle)
- [Orderbook](#orderbook)
- [Agent API Endpoints](#agent-api-endpoints)
- [Market Data](#market-data)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Security](#security)
- [Contract Addresses](#contract-addresses-monad-mainnet-chain-id-143)
- [Cautions and Warnings](#cautions-and-warnings)

---

## Project Context

Nad.fun is a meme token launchpad on the Monad blockchain (chain ID 143) that uses bonding curves to bootstrap token liquidity. Tokens begin their lifecycle on a bonding curve, where the price rises algorithmically as more buyers enter. When a token reaches its target liquidity threshold, it "graduates" from the bonding curve and migrates to a decentralized exchange (DEX) for open market trading.

Nad.fun does not natively support limit orders. Users can only execute immediate market buys and sells against the bonding curve or DEX. This project fills that gap by providing **synthetic limit orders** -- orders that are monitored off-chain by an automated agent and executed on-chain when user-defined trigger conditions are met.

The term "synthetic" reflects that these are not native protocol-level limit orders. Instead, the system continuously polls on-chain state and external market data, evaluates each active order against its trigger conditions, and submits transactions to the blockchain when those conditions are satisfied.

Key characteristics:

- **Off-chain monitoring, on-chain execution**: The agent watches prices and market conditions off-chain, but all trades settle on Monad as real blockchain transactions.
- **Agent wallets**: Each user gets a dedicated system-generated wallet. The agent holds the user's trading funds and executes transactions autonomously.
- **Deterministic evaluation**: Trading decisions are purely rule-based. There is no AI involved in deciding when to trade -- the evaluator checks conditions with exact comparisons against thresholds.
- **AI agent layer**: AI models (Groq, Claude, OpenAI, or Gemini) power five capabilities: post-execution explanations, token analysis, strategy suggestions, pre-execution risk checks, and conversational chat. While AI now plays a broader role in analysis and user interaction, all trading decisions remain deterministic -- the evaluator still makes the final call with exact comparisons against thresholds.
- **Dual-router support**: The agent automatically detects whether a token is still on the bonding curve or has graduated to the DEX, and routes transactions to the correct contract.

---

## Architecture

The project is structured as a monorepo using npm workspaces with four packages:

```
nadfun-synthetic-limit-order/
  packages/
    shared/        # Shared types, constants, ABIs, utility functions
    db/            # Prisma ORM schema and client (MySQL)
  apps/
    agent/         # Express server (port 3001) -- monitor, execution engine, AI layer
    web/           # Next.js frontend (port 3000) -- RainbowKit wallet UI
```

### Packages

**`packages/shared`** -- Contains all shared TypeScript types (`Direction`, `TriggerType`, `OrderStatus`, `CreateOrderRequest`, `UnsignedTxPayload`, `AiMessage`, `AiProvider`, `AiProviderConfig`), contract addresses, ABI definitions, the Monad chain configuration, and utility functions for price calculation and slippage math.

**`packages/db`** -- Contains the Prisma schema (`schema.prisma`) and generates the Prisma client. Database is MySQL, defaulting to `mysql://root:@localhost:3306/nadfun_limit_orders`.

### Applications

**`apps/agent`** -- The backend agent server built on Express. It runs on port 3001 (configurable via `AGENT_PORT`) and contains:

- **Monitor loop** (`monitor/loop.ts`): Runs every 5 seconds (configurable via `MONITOR_INTERVAL_MS`). Fetches all active orders from the database, batch-fetches on-chain token states via Lens contract multicall, evaluates each order against its trigger conditions, and auto-executes triggered trades.
- **Evaluator** (`monitor/evaluator.ts`): Pure-function deterministic evaluator. Takes an order and a token state, returns whether the order should trigger, abort, or keep waiting.
- **State fetcher** (`monitor/state-fetcher.ts`): Fetches on-chain token data (name, symbol, graduation status, lock status, bonding curve progress, buy/sell quotes, total supply) via multicall to the Lens contract. Also fetches market data from the Nad.fun REST API (price, market cap, volume, holder count, ATH) with a 10-second cache.
- **Quote fetcher** (`monitor/quote-fetcher.ts`): Fetches fresh quotes for a specific input amount and direction.
- **Execution engine** (`execution/`): Router selector (bonding curve vs. DEX), slippage guard, transaction builder (encodes contract calls), and transaction executor (signs and sends via viem wallet client, waits for receipt).
- **AI layer** (`ai/`): Groq, Claude, OpenAI, and Gemini providers (`groq.ts`, `claude.ts`, `openai.ts`, `gemini.ts`) with automatic fallback and round-robin "Auto" mode. Provides five capabilities: post-execution explanations, token analysis, strategy suggestions, pre-execution risk checks (`risk-check.ts`), and conversational chat.
- **SSE events** (`events/`): Server-Sent Events endpoint for real-time push notifications to the frontend. Events include `order:triggered`, `order:executed`, `order:failed`, `order:expired`, and `order:aborted`.
- **Database layer** (`db/`): Account management (wallet generation, encryption/decryption), order CRUD, execution log writes, AI config storage.

**`apps/web`** -- The Next.js frontend running on port 3000. Pages include:

- `/` -- Home / dashboard
- `/create` -- Create a new order
- `/orders` -- View and manage existing orders
- `/orderbook/[token]` -- CLOB-style orderbook for a specific token
- `/settings` -- Agent wallet management, AI key configuration, key export
- `/chat` -- AI conversational interface (context-aware chat with token and order data)

Uses RainbowKit for wallet connection (MetaMask, WalletConnect, etc.) with the Monad chain.

### Data Flow Diagram

```
User Browser (Next.js :3000)
    |
    |-- RainbowKit wallet connection
    |-- REST calls to Agent API
    |-- SSE subscription for real-time events
    |
    v
Agent Server (Express :3001)
    |
    |-- Monitor Loop (every 5s)
    |     |-- Fetch active orders from MySQL
    |     |-- Multicall Lens contract for on-chain state
    |     |-- Fetch Nad.fun API for market data
    |     |-- Evaluate each order (deterministic)
    |     |-- AI risk check (opt-in, fail-open, blocks if confidence > 70%)
    |     |-- Execute triggered orders (sign + send tx)
    |     |-- Generate AI explanation (best-effort)
    |     |-- Emit SSE events to connected clients
    |     |-- Write execution logs to DB
    |
    v
Monad Blockchain (Chain ID 143)
    |-- BondingCurveRouter (pre-graduation trades)
    |-- DexRouter (post-graduation trades)
    |-- Lens contract (state reads via multicall)
    |-- ERC-20 token contracts
```

---

## How It Works

1. **User connects wallet**: The user opens the web app and connects their Monad wallet via RainbowKit (MetaMask, WalletConnect, or other supported providers).

2. **System creates an AI agent**: When the user first interacts, the system generates a new Ethereum-compatible wallet dedicated to that user. The private key is encrypted with AES-256-CBC using a scrypt-derived key with a random per-key salt, and stored in the database.

3. **User funds the agent wallet**: The user sends MON (Monad's native token) to the agent wallet address for buy orders, and/or transfers the target ERC-20 tokens to the agent wallet for sell orders. The agent wallet address is displayed in the UI.

4. **User creates orders**: Through the Create Order page, the user specifies:
   - Token address
   - Direction (BUY or SELL)
   - Input amount (MON for buys, tokens for sells)
   - Trigger type and trigger value
   - Maximum slippage tolerance (in basis points, default 300 = 3%)
   - Expiration date/time

5. **Agent monitors conditions**: The monitor loop runs every 5 seconds. For each active order, it:
   - Fetches the token's on-chain state (price, progress, graduation status, lock status) via a batched multicall to the Lens contract
   - Fetches market data from the Nad.fun REST API
   - Runs the deterministic evaluator to check if trigger conditions are met
   - Checks for order expiration
   - For TRAILING_STOP orders, updates the tracked peak price if the current price exceeds the previous peak

6. **Agent auto-executes**: When conditions are met:
   - Fetches a fresh quote for the exact input amount
   - Validates slippage against the user's maximum tolerance
   - Selects the correct router (BondingCurveRouter or DexRouter) based on the quote
   - For sell orders, ensures ERC-20 approval is granted to the router
   - Builds the unsigned transaction (encodes the contract call data)
   - Signs and sends the transaction using the agent wallet's private key
   - Waits for the transaction receipt (up to 60 seconds)
   - Updates order status to EXECUTED (or FAILED)
   - Writes a detailed execution log including AI explanation
   - For DCA_INTERVAL orders, re-activates the order for the next interval

7. **Real-time notifications**: The user receives SSE events in their browser for each state change -- triggered, executed, failed, expired, or aborted.

---

## Creating an Agent Wallet

The agent wallet is a system-generated Ethereum-compatible wallet that holds funds and executes trades on the user's behalf.

### Steps

1. Navigate to the **Settings** page or the **Create Order** page.
2. Click **"Create AI Agent"**.
3. The system generates a new private key using viem's `generatePrivateKey()`, derives the public address, encrypts the private key, and stores it in the database.
4. The agent wallet address is displayed in the UI.
5. **Fund the agent wallet**:
   - For **buy orders**: Send MON directly to the agent wallet address. This is the native token that will be spent to purchase meme tokens.
   - For **sell orders**: Transfer the specific ERC-20 tokens you want to sell to the agent wallet address.
6. The agent wallet is now ready to execute trades autonomously.

### Important Notes

- Each user gets exactly one agent wallet (mapped 1:1 to their connected wallet address).
- If you already have an agent wallet, calling "Create AI Agent" again returns the existing one.
- The agent wallet address is different from your main wallet address.
- You can export the agent wallet's private key from the Settings page (requires a wallet signature for verification).
- Treat the agent wallet's private key with the same care as any other wallet holding real funds.

---

## AI Agent Configuration

AI API keys power the platform's AI features: post-execution explanations, token analysis, strategy suggestions, pre-execution risk checks, and conversational chat. While AI now plays a significantly expanded role in analysis, recommendations, and user interaction, all trading decisions remain **100% deterministic**.

### How Trading Decisions Work

All trading decisions are **100% deterministic**. The evaluator (`evaluator.ts`) is a pure function that takes an order's trigger conditions and the current token state, and returns a boolean. There is no machine learning, no AI model, and no probabilistic element in the decision to trigger or not trigger an order. The optional AI risk check can block an execution, but uses a fail-open design and only intervenes when confidence exceeds 70%.

### What the AI Does

The AI layer provides five capabilities:

1. **Post-execution explanations** -- After an order triggers and executes, the AI generates a natural-language explanation of why the order fired and how the trade went.
2. **Token analysis** -- Analyzes on-chain and Nad.fun market data to provide sentiment, risk assessment, and observations about a token.
3. **Strategy suggestions** -- Recommends trigger type, trigger value, and slippage settings for order creation based on current market conditions. Returns structured JSON that auto-fills the order creation form.
4. **Pre-execution risk checks** -- Opt-in (via Settings). Runs between trigger evaluation and trade execution. Uses a fail-open design and only blocks execution when confidence exceeds 70%.
5. **Conversational chat** -- Context-aware AI chat interface at `/chat` that understands the user's active orders, wallet balances, and market conditions.

### Supported Providers

| Provider | Model | Environment Variable | Per-User Config |
|----------|-------|---------------------|-----------------|
| Groq | llama-3.3-70b-versatile | `DEFAULT_GROQ_API_KEY` | Settings page |
| Claude (Anthropic) | Claude | `DEFAULT_CLAUDE_API_KEY` | Settings page |
| OpenAI | GPT-4o | `DEFAULT_OPENAI_API_KEY` | Settings page |
| Gemini (Google) | Gemini | `DEFAULT_GEMINI_API_KEY` | Settings page |

### Auto Mode

When the preferred provider is set to `auto` (the new default), the system uses round-robin rotation through all configured providers. This distributes load across providers, avoids single-provider rate limits, and provides automatic redundancy. Each AI request cycles to the next available provider in the rotation.

### Fallback Order

The system tries the user's preferred provider first (or the next provider in the round-robin rotation for Auto mode), then falls back to the remaining providers in order. The default fallback sequence:

1. Groq (fastest, default first in rotation)
2. Claude (fallback)
3. OpenAI (fallback)
4. Gemini (fallback)

If all providers fail or no API keys are configured, the system returns a default message: *"AI explanation unavailable. Order was triggered based on deterministic rule evaluation."*

### Configuration Methods

- **Environment variables**: Set `DEFAULT_GROQ_API_KEY`, `DEFAULT_CLAUDE_API_KEY`, `DEFAULT_OPENAI_API_KEY`, and/or `DEFAULT_GEMINI_API_KEY` in the `.env` file. These serve as defaults for all users who have not configured their own keys.
- **Per-user keys**: Users can configure their own API keys via the Settings page (BYOK -- Bring Your Own Key). Per-user keys are stored in the `AiConfig` table in the database.

---

## AI Agent Capabilities

The AI agent layer provides five distinct capabilities. All capabilities are best-effort and non-blocking to the core trading loop unless explicitly opted in (risk checks).

### 1. Post-Execution Explanations

The original AI feature. After an order triggers and executes (or fails), the AI generates a human-readable explanation of what happened:

> "Your buy order for TOKEN triggered because the price dropped to 0.00008 MON/token, which is below your target of 0.0001 MON/token. The trade was executed on the bonding curve router with 2.1% slippage, purchasing approximately 125,000 tokens for 0.01 MON."

Explanations are stored in the `aiExplanation` field of the `ExecutionLog` table and displayed in the order detail view. If no AI provider is available, a default deterministic message is used instead.

### 2. Token Analysis

Accessible via `GET /ai/analyze/:token?wallet=0x...`. The AI analyzes a combination of on-chain token data (from the Lens contract) and Nad.fun market data (price, market cap, volume, holder count, ATH) to produce:

- **Sentiment assessment** -- Bullish, bearish, or neutral based on current market signals.
- **Risk evaluation** -- Identifies risk factors such as low liquidity, high concentration, or extreme volatility.
- **Key observations** -- Notable data points like bonding curve progress, graduation proximity, lock status, and recent volume trends.

The analysis is rate limited to 10 requests per minute per IP. The response includes the analysis text, the provider used, and a structured token summary.

### 3. Strategy Suggestions

Accessible via `POST /ai/suggest-strategy`. Given a token address, direction (BUY/SELL), and input amount, the AI recommends order parameters:

- **Trigger type** -- Which trigger condition to use (e.g., PRICE_BELOW, TRAILING_STOP).
- **Trigger value** -- The specific threshold value for the trigger.
- **Max slippage (bps)** -- Recommended slippage tolerance based on current market conditions.
- **Reasoning** -- Explanation of why these parameters were chosen.

The response is structured JSON that the frontend uses to auto-fill the order creation form. The user can review and adjust the suggested values before submitting the order. The AI suggestion is advisory only -- the user retains full control over the final order parameters.

### 4. Pre-Execution Risk Check

An opt-in feature controlled by the `aiRiskCheck` field on the `UserAccount` table (default: false). Users can enable it from the Settings page via `PATCH /account/settings`.

When enabled, the risk check runs **between** the deterministic trigger evaluation and the actual trade execution. The design principles:

- **Fail-open**: If the AI provider is unavailable, times out, or returns an error, the trade proceeds as normal. The risk check never blocks execution due to its own failure.
- **Confidence threshold**: The AI only blocks execution when its confidence that the trade is risky exceeds **70%**. Below that threshold, the trade proceeds.
- **Non-destructive**: Blocked trades are logged but the order remains ACTIVE and will be re-evaluated in the next monitor cycle. The order is not cancelled or failed.
- **Transparent**: When a trade is blocked, the reason is logged in the execution log and surfaced to the user via SSE events.

### 5. AI Chat

Accessible via the `/chat` page in the web frontend and the `POST /ai/chat` API endpoint. Provides a conversational interface where users can ask questions about:

- Their active orders and order history
- Token analysis and market conditions
- Strategy recommendations
- General questions about the platform

The chat is context-aware -- it has access to the user's active orders and wallet balances to provide relevant, personalized responses. Chat history is maintained **client-side only** (not stored in the database) for privacy. The endpoint is rate limited to 10 requests per minute per IP.

---

## AI Providers

The platform supports four AI providers. Each can be configured at the system level (environment variables) or per-user (Settings page / BYOK).

| Provider | Model | Speed | Best For |
|----------|-------|-------|----------|
| Groq | llama-3.3-70b-versatile | Fastest | Risk checks, chat (low latency) |
| Claude (Anthropic) | Claude | Fast | Detailed analysis, explanations |
| OpenAI | GPT-4o | Fast | Strategy suggestions, general use |
| Gemini (Google) | Gemini | Fast | Token analysis, general use |

All providers implement the same interface and can be used interchangeably for any capability. Provider selection is determined by the user's `preferredProvider` setting (default: `auto` for round-robin rotation).

---

## Trigger Types

### BUY Triggers

Buy triggers spend MON from the agent wallet to purchase tokens.

#### 1. PRICE_BELOW -- Buy When Price Drops to Target

- **Trigger value**: Price in MON (wei format)
- **Condition**: `currentPrice <= triggerValue`
- **Example**: Set trigger value to `100000000000000` (0.0001 MON in wei). When the token price drops to 0.0001 MON/token or below, the agent buys.
- **Use case**: "Buy the dip" -- accumulate tokens when price falls to a specific level.
- **Notes**: Price is calculated as the cost per token based on the Lens contract's `getAmountOut` for 1 token (1e18 wei) of input.

#### 2. PROGRESS_BELOW -- Buy When Bonding Curve Progress Drops

- **Trigger value**: Progress in basis points (100 = 1%, 10000 = 100%)
- **Condition**: `state.progress <= triggerValue`
- **Example**: Set to `5000` (50%). When the bonding curve is at or below 50% filled, the agent buys.
- **Use case**: Buy early-stage tokens before they accumulate enough liquidity to graduate.
- **Notes**: Only meaningful for pre-graduation tokens. The progress value comes from the Lens contract's `getProgress()` function. This trigger type is hidden in the UI after a token graduates.

#### 3. MCAP_BELOW -- Buy When Market Cap Drops Below Target

- **Trigger value**: Market cap in MON (wei format)
- **Condition**: `(currentPrice * totalSupply / 1e18) <= triggerValue`
- **Example**: Set to `5000000000000000000000` (5000 MON in wei). When the fully diluted market cap drops to 5000 MON or below, the agent buys.
- **Use case**: Value buying based on overall market valuation rather than per-token price.

#### 4. DCA_INTERVAL -- Dollar-Cost Averaging at Regular Intervals

- **Trigger value**: Interval in milliseconds
- **Condition**: `(now - lastExecutedAt) >= triggerValue`
- **Preset options**:
  - 1 minute: `60000`
  - 5 minutes: `300000`
  - 15 minutes: `900000`
  - 1 hour: `3600000`
  - 4 hours: `14400000`
  - 12 hours: `43200000`
  - 24 hours: `86400000`
- **Example**: Set to `3600000` (1 hour) with input amount of 0.1 MON. The agent buys 0.1 MON worth of tokens every hour.
- **Use case**: Automated accumulation strategy that reduces timing risk by spreading purchases over time.
- **Notes**: Unlike other triggers, DCA orders are **re-activated** after each execution. The order stays ACTIVE and continues to trigger at each interval until it expires or is cancelled. The `lastExecutedAt` timestamp is updated after each successful execution.

#### 5. PRICE_DROP_PCT -- Buy After a Percentage Drop from Reference Price

- **Trigger value**: Drop percentage in basis points (1000 = 10%, 2000 = 20%)
- **Condition**: `currentPrice <= referencePrice * (10000 - triggerValue) / 10000`
- **Example**: Set to `2000` (20%). If the price at order creation was 0.001 MON, the agent buys when the price drops to 0.0008 MON or below.
- **Use case**: "Buy the dip" with percentage-based targeting relative to the price at order creation.
- **Notes**: The reference price is automatically captured at order creation time and stored in the `referencePrice` field.

### SELL Triggers

Sell triggers sell tokens from the agent wallet in exchange for MON.

#### 1. PRICE_ABOVE -- Sell When Price Rises to Target

- **Trigger value**: Price in MON (wei format)
- **Condition**: `currentPrice >= triggerValue`
- **Example**: Set to `1000000000000000` (0.001 MON in wei). When the token price reaches 0.001 MON/token, the agent sells.
- **Use case**: Take profit at a specific price point.

#### 2. PROGRESS_ABOVE -- Sell When Bonding Curve Progress Rises

- **Trigger value**: Progress in basis points
- **Condition**: `state.progress >= triggerValue`
- **Example**: Set to `9000` (90%). When the bonding curve reaches 90% filled, the agent sells.
- **Use case**: Sell before graduation, anticipating a potential dump at the graduation event.
- **Notes**: Only works for pre-graduation tokens.

#### 3. POST_GRADUATION -- Sell After Token Graduates to DEX

- **Trigger value**: `0` (automatic, no value needed)
- **Condition**: `state.isGraduated === true`
- **Example**: The agent automatically sells when the token migrates from the bonding curve to the DEX.
- **Use case**: Exit position at the graduation event.

#### 4. MCAP_ABOVE -- Sell When Market Cap Rises Above Target

- **Trigger value**: Market cap in MON (wei format)
- **Condition**: `(currentPrice * totalSupply / 1e18) >= triggerValue`
- **Example**: Set to `50000000000000000000000` (50000 MON in wei). When the fully diluted market cap exceeds 50000 MON, the agent sells.
- **Use case**: Take profit based on market valuation milestones.

#### 5. TRAILING_STOP -- Sell After Price Drops a Percentage from Peak

- **Trigger value**: Drop percentage in basis points (e.g., 2000 = 20%)
- **Condition**: `currentPrice <= peakPrice * (10000 - triggerValue) / 10000`
- **Example**: Set to `2000` (20%). If the peak tracked price was 0.001 MON, the agent sells when the price drops to 0.0008 MON.
- **Use case**: Protect gains while allowing upside. The trailing stop "follows" the price up and only triggers on a pullback.
- **Notes**: The `peakPrice` is continuously updated by the monitor loop. Every 5 seconds, if the current price exceeds the stored peak, the peak is updated in the database. This means the stop level automatically ratchets higher as the price rises.

#### 6. TAKE_PROFIT -- Sell After Price Gains a Percentage from Reference

- **Trigger value**: Gain percentage in basis points (e.g., 5000 = 50%, 10000 = 100%)
- **Condition**: `currentPrice >= referencePrice * (10000 + triggerValue) / 10000`
- **Example**: Set to `5000` (50%). If the price at order creation was 0.001 MON, the agent sells when the price reaches 0.0015 MON (50% gain).
- **Use case**: Lock in profits at a target percentage gain from entry.
- **Notes**: The reference price is automatically captured at order creation time.

---

## Order Lifecycle

Each order transitions through a well-defined set of statuses:

| Status | Description |
|--------|-------------|
| **ACTIVE** | The order is being actively monitored by the agent loop every 5 seconds. |
| **TRIGGERED** | Trigger conditions have been met. The agent is in the process of executing the trade. |
| **EXECUTED** | The trade completed successfully on-chain. The transaction hash is saved in the order record. |
| **EXPIRED** | The order passed its `expiresAt` timestamp without triggering. The agent automatically marks it expired. |
| **CANCELLED** | The user manually cancelled the order via the UI or API. |
| **FAILED** | Execution failed. Possible causes: insufficient balance in agent wallet, transaction reverted on-chain, slippage exceeded, token approval failed, or RPC errors. |

### State Transitions

```
ACTIVE --[conditions met]--> TRIGGERED --[tx success]--> EXECUTED
ACTIVE --[conditions met]--> TRIGGERED --[tx failed]---> FAILED
ACTIVE --[time passed]-----> EXPIRED
ACTIVE --[user action]-----> CANCELLED
ACTIVE --[token locked]----> (aborted, stays active or logged)
```

For **DCA_INTERVAL** orders, the flow is:

```
ACTIVE --> TRIGGERED --> EXECUTED --> ACTIVE (re-activated for next interval)
```

---

## Orderbook

The platform provides a CLOB-style (Central Limit Order Book) orderbook view for each token, accessible at `/orderbook/[token]`.

### Features

- **Buy orders (bids)**: Displayed sorted by trigger value descending (highest bid first).
- **Sell orders (asks)**: Displayed sorted by trigger value ascending (lowest ask first).
- **Order details**: Each entry shows trigger type, trigger value, input amount, slippage tolerance, status, and creation time.
- **Spread calculation**: The visual gap between the best bid (highest buy trigger) and best ask (lowest sell trigger).
- **Visual depth bars**: Relative order sizes shown as horizontal bars.
- **Auto-refresh**: The orderbook data refreshes every 5 seconds to stay in sync with the agent's monitoring cycle.

### API Response Format

```json
{
  "tokenAddress": "0x...",
  "buyOrders": [
    {
      "id": "clxyz...",
      "triggerType": "PRICE_BELOW",
      "triggerValue": "100000000000000",
      "inputAmount": "1000000000000000000",
      "maxSlippageBps": 300,
      "status": "ACTIVE",
      "createdAt": "2025-01-15T12:00:00.000Z"
    }
  ],
  "sellOrders": [...],
  "totalBuyOrders": 5,
  "totalSellOrders": 3
}
```

---

## Agent API Endpoints

All endpoints are served by the Express agent server on port 3001.

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check. Returns `{ status: "ok", timestamp: <ms> }`. |

### Server-Sent Events (SSE)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events?wallet=0x...` | Opens an SSE connection filtered by wallet address. Emits events: `connected`, `order:triggered`, `order:executed`, `order:failed`, `order:expired`, `order:aborted`. Sends keepalive every 30 seconds. |

### Account / Agent Wallet

| Method | Path | Rate Limit | Description |
|--------|------|------------|-------------|
| `POST` | `/account` | Global (100/min) | Create an agent wallet. Body: `{ walletAddress: "0x..." }`. Returns agent address and metadata. Idempotent -- returns existing account if already created. |
| `GET` | `/account?wallet=0x...` | Global (100/min) | Get account info. Returns wallet address, agent address, auto-execute flag, creation date. |
| `GET` | `/account/balance?wallet=0x...&token=0x...` | Global (100/min) | Get agent wallet balances. Returns MON balance (raw and formatted) and optionally the token balance if `token` query param is provided. |
| `POST` | `/account/export-key` | Sensitive (5/min) | Export the agent wallet's private key. Body: `{ walletAddress, message, signature }`. Requires a valid ECDSA signature from the user's wallet with a timestamp within the last 5 minutes. |
| `PATCH` | `/account/settings` | Global (100/min) | Update account settings. Body: `{ walletAddress, aiRiskCheck: boolean }`. Toggles the opt-in AI risk check before order execution. |

### Orders

| Method | Path | Rate Limit | Description |
|--------|------|------------|-------------|
| `GET` | `/orders?wallet=0x...` | Global (100/min) | List all orders for a wallet address. Returns array of order objects with execution logs. |
| `GET` | `/orders/:id` | Global (100/min) | Get a single order by ID. Returns order object with execution logs. |
| `POST` | `/orders` | Sensitive (5/min) | Create a new order. Body: `{ walletAddress, tokenAddress, direction, inputAmount, triggerType, triggerValue, maxSlippageBps, expiresAt, referencePrice?, peakPrice? }`. |
| `PATCH` | `/orders/:id/cancel` | Global (100/min) | Cancel an active order. Sets status to CANCELLED. |
| `POST` | `/orders/:id/confirm` | Global (100/min) | Manually confirm an order execution. Body: `{ txHash }`. Sets status to EXECUTED with the provided tx hash. |

### Orderbook

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/orderbook/:token` | Get the orderbook for a token address. Returns sorted buy orders (bids) and sell orders (asks) with totals. |

### Token State

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/token/:address` | Get comprehensive token state. Returns on-chain data (name, symbol, graduation status, lock status, progress, total supply, buy/sell quotes) and Nad.fun API market data (price, market cap, volume, holders, ATH). |

### Quote

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quote?token=0x...&amount=...&isBuy=true` | Get a fresh price quote. Returns the router address, expected output amount, and timestamp. `amount` is in wei. `isBuy` is `"true"` or `"false"`. |

### AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ai-config?wallet=0x...` | Get AI configuration for a wallet. Returns preferred provider and boolean flags for which API keys are configured (does not expose the actual keys). |
| `POST` | `/ai-config` | Create or update AI configuration. Body: `{ walletAddress, preferred?, claudeApiKey?, openaiApiKey?, geminiApiKey? }`. |

### AI Features

| Method | Path | Rate Limit | Description |
|--------|------|------------|-------------|
| `GET` | `/ai/analyze/:token?wallet=0x...` | AI (10/min) | AI token analysis. Analyzes on-chain and market data for the specified token. Returns analysis text, provider used, and a structured token summary. |
| `POST` | `/ai/suggest-strategy` | Global (100/min) | AI strategy suggestion. Body: `{ tokenAddress, direction, inputAmount, wallet }`. Returns a JSON suggestion with `triggerType`, `triggerValue`, `maxSlippageBps`, and `reasoning`. |
| `POST` | `/ai/chat` | AI (10/min) | AI conversational chat. Body: `{ wallet, messages: [{ role, content }] }`. Returns response text and provider used. Messages array follows the standard chat format with `role` ("user" or "assistant") and `content` fields. |

---

## Market Data

### On-Chain Data (via Lens Contract Multicall)

The agent fetches the following data directly from the blockchain using the Lens contract at `0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea`:

- **Token name and symbol**: From the ERC-20 contract.
- **Graduation status**: Whether the token has migrated from the bonding curve to the DEX (`isGraduated`).
- **Lock status**: Whether the token's bonding curve is currently locked (`isLocked`).
- **Bonding curve progress**: How close the token is to graduating (0-10000 basis points).
- **Buy/sell quotes**: Expected output for 1 token (1e18 wei) of input, for both buy and sell directions. The Lens contract also returns which router (bonding curve or DEX) would handle the trade.
- **Total supply**: The token's total supply from the ERC-20 contract.

All on-chain data is fetched using viem's `multicall`, which batches multiple contract calls into a single RPC request for efficiency.

### Nad.fun REST API Data

The agent also fetches market data from the Nad.fun REST API at `https://api.nad.fun/`:

- **Price** (MON and USD)
- **Market cap**
- **Trading volume**
- **Holder count**
- **All-time high (ATH) price** (MON and USD)
- **Market type** (CURVE or DEX)
- **Reserve balances** (native and token)

This data is cached in memory with a **10-second TTL** to avoid excessive API calls. The cache is refreshed when it expires and a token state fetch is requested.

---

## Environment Variables

All environment variables are configured in a `.env` file at the repository root. The agent loads them via `dotenv/config`.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONAD_RPC_URL` | `https://rpc.monad.xyz` | Monad RPC endpoint URL. |
| `DATABASE_URL` | `mysql://root:@localhost:3306/nadfun_limit_orders` | MySQL connection string. |
| `AGENT_PORT` | `3001` | Port for the agent Express server. |
| `MONITOR_INTERVAL_MS` | `5000` | How often (in ms) the monitor loop checks orders. |
| `TX_DEADLINE_SECONDS` | `300` | Transaction deadline for on-chain calls (5 minutes). |
| `AGENT_ENCRYPTION_KEY` | `nadfun-limit-order-default-key-32b` | Encryption key for agent wallet private keys. **MUST be changed in production.** |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | (none) | WalletConnect project ID for the frontend. |
| `NEXT_PUBLIC_AGENT_URL` | `http://localhost:3001` | Agent server URL for the frontend to call. |
| `DEFAULT_GROQ_API_KEY` | (none) | Default Groq API key for AI features. |
| `DEFAULT_CLAUDE_API_KEY` | (none) | Default Anthropic API key for AI features. |
| `DEFAULT_OPENAI_API_KEY` | (none) | Default OpenAI API key for AI features. |
| `DEFAULT_GEMINI_API_KEY` | (none) | Default Google Gemini API key for AI features. |

### Prisma Database

The Prisma CLI reads `DATABASE_URL` from `packages/db/.env` for standalone commands (like `prisma db push`). The agent reads it from the root `.env` via `dotenv/config`.

---

## Database Schema

The database uses MySQL with the following tables managed by Prisma ORM:

### UserAccount

Stores the mapping between a user's connected wallet and their system-generated agent wallet.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` (CUID) | Primary key. |
| `walletAddress` | `VarChar(42)` | User's connected wallet address (unique). |
| `agentAddress` | `VarChar(42)` | System-generated agent wallet address (unique). |
| `agentKeyEnc` | `VarChar(255)` | Encrypted private key (format: `salt:iv:ciphertext`). |
| `autoExecute` | `Boolean` | Whether auto-execution is enabled (default: true). |
| `aiRiskCheck` | `Boolean` | Opt-in AI risk check before order execution (default: false). When enabled, the AI evaluates triggered orders and can block execution if confidence exceeds 70%. |
| `createdAt` | `DateTime` | Account creation timestamp. |
| `updatedAt` | `DateTime` | Last update timestamp. |

### Order

Stores all limit orders with their trigger conditions and execution state.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` (CUID) | Primary key. |
| `walletAddress` | `VarChar(42)` | Owner's wallet address. |
| `tokenAddress` | `VarChar(42)` | Target token contract address. |
| `direction` | `Enum` | `BUY` or `SELL`. |
| `inputAmount` | `VarChar(78)` | Amount to spend (wei string). MON for buys, tokens for sells. |
| `triggerType` | `Enum` | One of the 11 trigger types (see [Trigger Types](#trigger-types)). |
| `triggerValue` | `VarChar(78)` | Trigger threshold (wei string or basis points depending on type). |
| `maxSlippageBps` | `Int` | Maximum acceptable slippage in basis points (default: 300 = 3%). |
| `expiresAt` | `DateTime` | Order expiration timestamp. |
| `status` | `Enum` | `ACTIVE`, `TRIGGERED`, `EXECUTED`, `EXPIRED`, `CANCELLED`, or `FAILED`. |
| `routerUsed` | `VarChar(42)?` | Router contract address used for execution. |
| `txHash` | `VarChar(66)?` | On-chain transaction hash (set on execution). |
| `referencePrice` | `VarChar(78)?` | Price at order creation (used by TAKE_PROFIT and PRICE_DROP_PCT). |
| `peakPrice` | `VarChar(78)?` | Tracked peak price (used by TRAILING_STOP, updated continuously). |
| `lastExecutedAt` | `DateTime?` | Last execution timestamp (used by DCA_INTERVAL). |
| `createdAt` | `DateTime` | Order creation timestamp. |
| `updatedAt` | `DateTime` | Last update timestamp. |

Indexes: `walletAddress`, `status`, `(tokenAddress, status)`.

### ExecutionLog

Detailed log of every evaluation action, trigger, and execution attempt.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` (CUID) | Primary key. |
| `orderId` | `String` | Foreign key to Order. |
| `action` | `Enum` | `CHECK`, `TRIGGER`, `ABORT`, `EXPIRE`, `USER_SIGNED`, `TX_CONFIRMED`, or `TX_FAILED`. |
| `currentPrice` | `VarChar(78)?` | Token price at the time of this log entry. |
| `currentProgress` | `VarChar(78)?` | Bonding curve progress at log time. |
| `isGraduated` | `Boolean?` | Whether token was graduated at log time. |
| `isLocked` | `Boolean?` | Whether token was locked at log time. |
| `routerAddress` | `VarChar(42)?` | Router used or selected. |
| `unsignedTxData` | `Json?` | Full unsigned transaction payload. |
| `txHash` | `VarChar(66)?` | Transaction hash if a tx was sent. |
| `aiExplanation` | `Text?` | AI-generated explanation text. |
| `aiProvider` | `VarChar(20)?` | Which AI provider generated the explanation. |
| `reason` | `Text?` | Human-readable reason for this log action. |
| `createdAt` | `DateTime` | Log entry timestamp. |

### AiConfig

Per-user AI provider configuration (BYOK).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` (CUID) | Primary key. |
| `walletAddress` | `VarChar(42)` | User's wallet address (unique). |
| `preferredProvider` | `VarChar(20)` | Preferred AI provider: `auto`, `groq`, `claude`, `openai`, or `gemini` (default: `auto`). |
| `groqApiKey` | `VarChar(255)?` | User's Groq API key. |
| `claudeApiKey` | `VarChar(255)?` | User's Anthropic API key. |
| `openaiApiKey` | `VarChar(255)?` | User's OpenAI API key. |
| `geminiApiKey` | `VarChar(255)?` | User's Google Gemini API key. |
| `createdAt` | `DateTime` | Config creation timestamp. |
| `updatedAt` | `DateTime` | Last update timestamp. |

---

## Security

### Agent Wallet Encryption

Agent wallet private keys are encrypted at rest using **AES-256-CBC** with a key derived via **scrypt** (a memory-hard key derivation function).

- **Encryption key**: Derived from the `AGENT_ENCRYPTION_KEY` environment variable using scrypt with a **random 16-byte salt generated per key**.
- **Storage format**: `<salt_hex>:<iv_hex>:<ciphertext_hex>` (3-part format with per-key salt).
- **Backward compatibility**: Legacy 2-part format (`<iv_hex>:<ciphertext_hex>` with static salt) is still supported for decryption.
- **Startup warning**: The agent logs a warning at startup if a known weak/default encryption key is detected.

### Key Export Authentication

The `/account/export-key` endpoint requires:

1. A valid **ECDSA signature** from the user's wallet.
2. The signed message must contain a **timestamp** that is less than **5 minutes old**.
3. The wallet address in the request body must match the signer of the message.

This prevents unauthorized key extraction even if someone has API access.

### Rate Limiting

Two tiers of rate limiting are applied:

| Tier | Limit | Endpoints |
|------|-------|-----------|
| Global | 100 requests per minute per IP | All endpoints |
| Sensitive | 5 requests per minute per IP | `/account/export-key`, `/orders` (POST) |

Rate limit state is stored in memory with automatic cleanup of stale entries every 60 seconds.

### Additional Security Measures

- **CORS**: Enabled via the `cors` middleware (all origins allowed -- should be restricted in production).
- **Transaction deadline**: All on-chain transactions include a deadline (default 300 seconds / 5 minutes) to prevent stale transactions from executing.
- **Slippage protection**: Every trade validates that the fresh quote does not deviate from the expected output by more than the user's `maxSlippageBps`. If slippage exceeds the threshold, the execution is aborted and logged.
- **Zero-quote protection**: If a fresh quote returns 0 `amountOut`, the execution is aborted (indicates invalid token state or a failed quote).
- **Balance verification for sells**: Before executing a sell, the agent checks the actual token balance in the agent wallet. If the balance is 0, the order is marked FAILED. If the balance is less than the order amount, the agent sells the available balance instead.

---

## Contract Addresses (Monad Mainnet, Chain ID: 143)

| Contract | Address | Description |
|----------|---------|-------------|
| **LENS** | `0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea` | Read-only contract for batched state queries (graduation status, progress, quotes). |
| **BONDING_CURVE_ROUTER** | `0x6F6B8F1a20703309951a5127c45B49b1CD981A22` | Router for buying/selling tokens on the bonding curve (pre-graduation). |
| **BONDING_CURVE** | `0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE` | The bonding curve contract itself. |
| **DEX_ROUTER** | `0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137` | Router for buying/selling tokens on the DEX (post-graduation). |
| **DEX_FACTORY** | `0x6B5F564339DbAD6b780249827f2198a841FEB7F3` | DEX pair factory contract. |
| **WMON** | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A` | Wrapped MON (WMON) token contract. |
| **Multicall3** | `0xcA11bde05977b3631167028862bE2a173976CA11` | Standard Multicall3 contract for batched calls. |

### Chain Configuration

```
Chain Name:       Monad
Chain ID:         143
Native Currency:  MON (18 decimals)
RPC URL:          https://rpc.monad.xyz
Block Explorer:   https://monadscan.com
```

**IMPORTANT**: The chain ID is **143**, not 10143. The RPC will reject signed transactions with an incorrect chain ID.

---

## Cautions and Warnings

### Operational Risks

- **Synthetic, not native**: These are off-chain monitored orders, not protocol-level limit orders. If the agent process is down, orders will not execute. There is no on-chain guarantee that an order will fill.
- **Agent uptime**: The agent must be running continuously for orders to be monitored and executed. If the agent crashes or is restarted, it will resume monitoring on the next loop iteration, but orders may have been missed during the downtime.
- **Monitor interval**: The 5-second monitor interval means there can be up to approximately 5 seconds of delay between conditions being met and the trade executing. During volatile periods, prices can move significantly in that window.
- **Slippage**: While slippage protection is applied (default 3%), rapid price movements can still cause the slippage check to pass at the evaluation time but the on-chain execution to receive a less favorable price. The `amountOutMin` parameter protects against the worst case, but the transaction may revert if slippage exceeds the threshold between quote and execution.

### Financial Risks

- **Fund only what you are willing to trade**: The agent wallet holds real funds. Only deposit the amount you intend to use for active orders.
- **DCA orders continue executing**: DCA_INTERVAL orders re-activate after each execution and will keep buying at the set interval until the order expires or is manually cancelled. Always set an appropriate expiration date to avoid unintended purchases.
- **Sell orders require tokens in the agent wallet**: For sell orders, the tokens must be in the agent wallet address, not in your main (connected) wallet. Transfer tokens to the agent address before creating sell orders.

### Security Risks

- **Encryption key**: The `AGENT_ENCRYPTION_KEY` is critical. If lost, encrypted private keys cannot be recovered. If leaked, all agent wallets are compromised. Use a strong, unique key in production and keep a secure backup.
- **Private key export**: The agent wallet's private key can be exported from the Settings page. Never share this key with anyone. Anyone with the private key has full control over the agent wallet's funds.
- **Default encryption key**: The system ships with a known default encryption key. A warning is logged at startup if this default is in use. **Change it immediately** in any non-development environment.

### Data Accuracy

- **Market data lag**: Market data from the Nad.fun REST API is cached for 10 seconds and may lag a few seconds behind the actual on-chain state. On-chain data fetched via the Lens contract is more current but still subject to RPC latency.
- **Token state unavailability**: If the Lens contract multicall fails for a token (e.g., the token address is invalid or the RPC is overloaded), the evaluator skips that order in the current cycle rather than making incorrect trading decisions.
- **Graduation transitions**: When a token graduates from the bonding curve to the DEX mid-monitoring, certain trigger types (PROGRESS_BELOW, PROGRESS_ABOVE for buys) are automatically aborted as they are no longer valid. The agent handles this gracefully.

---

## Development Setup

### Prerequisites

- Node.js (v18 or later)
- MySQL server running locally
- npm (comes with Node.js)

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd nadfun-synthetic-limit-order

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your actual values (especially AGENT_ENCRYPTION_KEY)

# 4. Set up the database
# Create the MySQL database first:
# mysql -u root -e "CREATE DATABASE nadfun_limit_orders;"
npm run db:push

# 5. Generate Prisma client
npm run db:generate

# 6. Build shared package
npm -w packages/shared run build

# 7. Start both agent and web in development
npm run dev
```

This starts:
- Agent server on `http://localhost:3001`
- Next.js frontend on `http://localhost:3000`

### Individual Commands

```bash
# Start only the agent
npm run dev:agent

# Start only the web frontend
npm run dev:web

# Build everything for production
npm run build

# Push Prisma schema to database
npm run db:push

# Regenerate Prisma client after schema changes
npm run db:generate
```

### Important Development Notes

- After editing files in `packages/shared`, you must recompile: `npx tsc -p packages/shared/tsconfig.json`
- Shared package imports must **not** use `.js` extensions (Next.js webpack is incompatible with them).
- The Next.js tsconfig needs `"target": "ES2022"` for BigInt literal support.
- The agent loads `.env` from the current working directory via `dotenv/config`, so run it from the repo root.
- Prisma CLI commands read from `packages/db/.env`, so ensure the `DATABASE_URL` is set there as well.
