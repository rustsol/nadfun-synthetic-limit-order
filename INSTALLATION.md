# Nad.fun Synthetic Limit Order Platform -- Installation and Setup Guide

This document provides comprehensive instructions for setting up the Nad.fun Synthetic Limit Order Platform locally. The platform is a monorepo built with npm workspaces, targeting the Monad blockchain (chain ID 143). It consists of a backend agent server, a Next.js frontend, shared libraries, and a Prisma-managed MySQL database.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone and Install](#clone-and-install)
3. [Database Setup](#database-setup)
4. [Prisma Setup](#prisma-setup)
5. [Database Schema Overview](#database-schema-overview)
6. [Environment Variables](#environment-variables)
7. [Building Packages](#building-packages)
8. [Running Services](#running-services)
9. [Package Structure](#package-structure)
10. [Development Workflow](#development-workflow)
11. [Important Notes](#important-notes)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure the following software is installed on your system before proceeding:

| Dependency   | Minimum Version | Recommended Version | Notes                                      |
|--------------|-----------------|---------------------|--------------------------------------------|
| **Node.js**  | v18+            | v20                 | Required for npm workspaces and tsx         |
| **npm**      | v9+             | Latest              | Ships with Node.js v18+                    |
| **MySQL**    | 8.0+            | 8.0+                | MariaDB is also supported as an alternative|
| **Git**      | Any recent      | Latest              | For cloning the repository                 |

Verify your installations:

```bash
node --version
npm --version
mysql --version
git --version
```

---

## Clone and Install

Clone the repository and install all workspace dependencies from the root:

```bash
git clone <repo-url>
cd nadfun-synthetic-limit-order
npm install
```

The `npm install` command installs dependencies for all workspaces defined in the root `package.json`:

- `packages/shared` -- Shared types, constants, ABIs, and utilities
- `packages/db` -- Prisma client and database schema
- `apps/agent` -- Backend agent server
- `apps/web` -- Next.js frontend

---

## Database Setup

### Install MySQL

If MySQL is not already installed, download and install it from the [official MySQL website](https://dev.mysql.com/downloads/mysql/) or use a package manager:

**Windows (via winget):**
```bash
winget install Oracle.MySQL
```

**macOS (via Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

### Create the Database

Connect to MySQL and create the database:

```bash
mysql -u root
```

```sql
CREATE DATABASE nadfun_limit_orders;
```

Verify the database was created:

```sql
SHOW DATABASES;
```

You should see `nadfun_limit_orders` in the list.

### Default Connection

The default connection string assumes a root user with no password on localhost:

```
mysql://root:@localhost:3306/nadfun_limit_orders
```

If your MySQL instance uses a different user, password, host, or port, adjust the `DATABASE_URL` accordingly in the format:

```
mysql://<user>:<password>@<host>:<port>/nadfun_limit_orders
```

### Where DATABASE_URL Is Configured

The `DATABASE_URL` must be set in **two** places:

1. **Root `.env` file** -- Used by the agent at runtime via `dotenv/config`
2. **`packages/db/.env`** -- Used by the Prisma CLI for migrations, schema push, and generation

Both files must contain the same connection string to avoid inconsistencies.

---

## Prisma Setup

After creating the database and configuring `DATABASE_URL` in both `.env` files (see [Environment Variables](#environment-variables)), run the following commands to set up the database schema:

```bash
cd packages/db
npx prisma generate
npx prisma db push
```

**What these commands do:**

- `npx prisma generate` -- Generates the Prisma Client based on the schema definition, making it available for import in application code.
- `npx prisma db push` -- Pushes the schema to the database, creating all tables and columns. This is a non-destructive sync that creates missing tables and columns without dropping data.

This creates the following tables: **UserAccount**, **Order**, **ExecutionLog**, and **AiConfig**.

---

## Database Schema Overview

### UserAccount

Stores user wallet information and agent wallet configuration.

| Column           | Description                                                        |
|------------------|--------------------------------------------------------------------|
| `walletAddress`  | The user's primary wallet address (connected via WalletConnect)    |
| `agentAddress`   | The system-generated agent wallet address for automated execution  |
| `agentKeyEnc`    | Agent wallet private key, encrypted with AES-256-CBC + scrypt      |
| `autoExecute`    | Whether automatic order execution is enabled for this user         |
| `aiRiskCheck`    | Whether AI performs a risk assessment before auto-executing orders (opt-in) |

### Order

Stores limit order definitions and their current state.

| Column            | Description                                                       |
|-------------------|-------------------------------------------------------------------|
| `walletAddress`   | The user who created the order                                    |
| `tokenAddress`    | Target token contract address                                     |
| `direction`       | Buy or sell                                                       |
| `inputAmount`     | Amount of input token for the trade                               |
| `triggerType`     | Condition type (e.g., price threshold, percentage change)         |
| `triggerValue`    | Threshold value for the trigger condition                         |
| `maxSlippageBps`  | Maximum allowed slippage in basis points                          |
| `expiresAt`       | Order expiration timestamp                                        |
| `status`          | Current order status (pending, executed, cancelled, expired, etc.)|
| `routerUsed`      | Which router was used for execution (bonding curve or DEX)        |
| `txHash`          | On-chain transaction hash (populated after execution)             |
| `referencePrice`  | Price at time of order creation                                   |
| `peakPrice`       | Peak price observed during monitoring (for trailing orders)       |
| `lastExecutedAt`  | Timestamp of last execution attempt                               |

### ExecutionLog

Records each execution attempt and its outcome.

| Column            | Description                                                       |
|-------------------|-------------------------------------------------------------------|
| `orderId`         | Reference to the associated Order                                 |
| `action`          | The action taken (execute, skip, fail, etc.)                      |
| `currentPrice`    | Token price at the time of this log entry                         |
| `currentProgress` | Bonding curve progress percentage                                 |
| `isGraduated`     | Whether the token has graduated from the bonding curve            |
| `isLocked`        | Whether the token liquidity is locked                             |
| `routerAddress`   | Contract address of the router used                               |
| `unsignedTxData`  | Raw unsigned transaction data                                     |
| `txHash`          | On-chain transaction hash (if submitted)                          |
| `aiExplanation`   | AI-generated explanation of the execution decision                |
| `aiProvider`      | Which AI provider generated the explanation                       |
| `reason`          | Machine-readable reason code                                      |

### AiConfig

Per-user AI provider preferences and API keys.

| Column              | Description                                                     |
|---------------------|-----------------------------------------------------------------|
| `walletAddress`     | The user this configuration belongs to                          |
| `preferredProvider` | Preferred AI provider: `auto`, `groq`, `claude`, `openai`, or `gemini` (default: `auto`) |
| `groqApiKey`        | User's personal Groq API key (optional)                         |
| `claudeApiKey`      | User's personal Claude API key (optional)                       |
| `openaiApiKey`      | User's personal OpenAI API key (optional)                       |
| `geminiApiKey`      | User's personal Gemini API key (optional)                       |

---

## Environment Variables

### Root `.env` File

Create a `.env` file in the project root directory:

```env
# Monad RPC
MONAD_RPC_URL=https://rpc.monad.xyz

# Database
DATABASE_URL=mysql://root:@localhost:3306/nadfun_limit_orders

# Agent
AGENT_PORT=3001
MONITOR_INTERVAL_MS=5000
TX_DEADLINE_SECONDS=300

# Frontend
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-walletconnect-project-id>
NEXT_PUBLIC_AGENT_URL=http://localhost:3001

# AI Provider Keys (optional -- for order execution explanations)
DEFAULT_GROQ_API_KEY=
DEFAULT_CLAUDE_API_KEY=
DEFAULT_OPENAI_API_KEY=
DEFAULT_GEMINI_API_KEY=

# Security -- CHANGE THIS IN PRODUCTION!
AGENT_ENCRYPTION_KEY=<generate-a-strong-random-32-char-key>
```

### Prisma `.env` File

Create a `.env` file at `packages/db/.env`:

```env
DATABASE_URL=mysql://root:@localhost:3306/nadfun_limit_orders
```

### Variable Reference

| Variable                                | Required | Description                                                                                                                                       |
|-----------------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `MONAD_RPC_URL`                         | Yes      | Monad mainnet RPC endpoint. The public endpoint is `https://rpc.monad.xyz`. Use a private RPC for production workloads.                           |
| `DATABASE_URL`                          | Yes      | MySQL connection string in the format `mysql://user:password@host:port/database`. Must be identical in both `.env` files.                         |
| `AGENT_PORT`                            | No       | Port for the agent Express server. Defaults to `3001`.                                                                                            |
| `MONITOR_INTERVAL_MS`                   | No       | How often (in milliseconds) the monitor loop checks order conditions. Default is `5000` (5 seconds). Lower values increase RPC usage.             |
| `TX_DEADLINE_SECONDS`                   | No       | Transaction deadline for on-chain trades in seconds. Default is `300` (5 minutes). Transactions not mined within this window will revert.         |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`  | Yes      | WalletConnect project ID. Obtain one for free at [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/).                            |
| `NEXT_PUBLIC_AGENT_URL`                 | Yes      | Full URL where the agent server is accessible. For local development, use `http://localhost:3001`.                                                |
| `DEFAULT_GROQ_API_KEY`                  | No       | Default Groq API key. Groq uses LPU inference for fastest AI responses.                                                                           |
| `DEFAULT_CLAUDE_API_KEY`                | No       | Default Anthropic Claude API key. Used for AI-generated execution explanations when the user has not configured their own key.                     |
| `DEFAULT_OPENAI_API_KEY`                | No       | Default OpenAI API key. Used as a fallback AI provider for execution explanations.                                                                |
| `DEFAULT_GEMINI_API_KEY`                | No       | Default Google Gemini API key. Used as a fallback AI provider for execution explanations.                                                         |
| `AGENT_ENCRYPTION_KEY`                  | Yes      | Encryption key for agent wallet private keys stored in the database. Uses AES-256-CBC with scrypt key derivation. **Must be changed from any default value before deploying to production.** Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

**Note on AI keys:** At least one AI provider key is recommended for the explanation feature to work. Groq is the fastest provider (LPU inference) and the system uses a fallback chain: Groq -> Claude -> OpenAI -> Gemini (or auto-rotation). If no keys are configured, execution explanations will be unavailable, but order execution itself will still function (the evaluator is deterministic and does not depend on AI).

---

## Building Packages

### Shared Package (must build first)

The shared package must be compiled before running the agent or frontend, as both depend on it:

```bash
npx tsc -p packages/shared/tsconfig.json
```

This compiles TypeScript source files from `packages/shared/src/` to `packages/shared/dist/`. You must rebuild this package after every change to any file in `packages/shared/src/`.

### Agent

The agent runs via `tsx` (a TypeScript execution engine) and does **not** require a separate build step for development. TypeScript files are compiled and executed on the fly.

### Frontend

Next.js handles TypeScript compilation automatically in development mode. No separate build step is needed for local development.

For a production build of the frontend:

```bash
cd apps/web
npx next build
```

---

## Running Services

### Development Mode

You need two terminal windows (or tabs) to run both services simultaneously.

**Terminal 1 -- Agent:**

Run from the repository root directory so that `dotenv/config` correctly loads the root `.env` file:

```bash
npx tsx apps/agent/src/index.ts
```

**Terminal 2 -- Frontend:**

```bash
cd apps/web
npx next dev --port 3000
```

### What Starts

| Service   | URL                      | Description                                                      |
|-----------|--------------------------|------------------------------------------------------------------|
| Agent     | http://localhost:3001     | REST API endpoints, SSE event stream, and the order monitor loop |
| Frontend  | http://localhost:3000     | Next.js web application with dashboard, order creation, orderbook, and settings pages |

### Verifying the Setup

1. Open http://localhost:3000 in your browser. The frontend should load.
2. The agent health can be checked by visiting http://localhost:3001 or any health endpoint exposed by the agent.
3. Connect a wallet via WalletConnect to begin creating orders.

---

## Package Structure

```
nadfun-synthetic-limit-order/
├── packages/
│   ├── shared/                # Shared types, constants, ABIs, utilities
│   │   └── src/
│   │       ├── contracts/     # Contract addresses and ABI imports
│   │       ├── types/         # TypeScript types (Order, AI, Token)
│   │       ├── utils/         # Price calculation, slippage math
│   │       └── constants/     # Chain definition (Monad), constants
│   └── db/                    # Prisma client singleton + schema
│       ├── prisma/
│       │   └── schema.prisma  # Database schema definition
│       └── src/
│           └── index.ts       # Prisma client export
├── apps/
│   ├── agent/                 # Backend agent server
│   │   └── src/
│   │       ├── ai/            # AI providers (Groq, Claude, OpenAI, Gemini) + fallback chain + risk check
│   │       ├── chain/         # Viem client + contract instances
│   │       ├── db/            # Database operations (orders, accounts, logs, ai-config)
│   │       ├── events/        # SSE emitter + handler
│   │       ├── execution/     # Router selector, slippage guard, tx builder, tx executor
│   │       ├── monitor/       # State fetcher, evaluator, quote fetcher, main loop
│   │       ├── server.ts      # Express server with all REST endpoints
│   │       └── index.ts       # Application entry point
│   └── web/                   # Next.js frontend
│       └── src/
│           ├── app/           # Pages: dashboard, create, orders, settings, orderbook
│           ├── components/    # React components: order, token, layout, providers
│           ├── hooks/         # Custom hooks: useOrders, useTokenState, useAgentEvents
│           └── lib/           # API client, wagmi config
├── abis/                      # Raw ABI JSON files
├── .env                       # Root environment configuration
└── package.json               # Workspace root with npm workspace definitions
```

---

## Development Workflow

### 1. Editing the Shared Package

After making changes to any file in `packages/shared/src/`:

```bash
npx tsc -p packages/shared/tsconfig.json
```

Both the agent and frontend import from the compiled output in `packages/shared/dist/`, so this step is required before changes take effect.

### 2. Editing the Agent

If running via `npx tsx`, you must restart the agent process manually after making changes. Alternatively, you can use a file watcher:

```bash
npx tsx watch apps/agent/src/index.ts
```

### 3. Editing the Frontend

Next.js automatically hot-reloads when source files change. No manual action is needed.

### 4. Editing the Prisma Schema

After modifying `packages/db/prisma/schema.prisma`:

```bash
cd packages/db
npx prisma db push
npx prisma generate
```

- `db push` synchronizes the schema with the database.
- `generate` regenerates the Prisma Client so that application code reflects the updated schema.

---

## Important Notes

- **Shared package imports must NOT use `.js` extensions.** Next.js webpack resolution is incompatible with `.js` extensions in import paths from workspace packages. Use extensionless imports (e.g., `import { foo } from '@nadfun/shared/types'`).

- **Next.js tsconfig target must be `ES2022` or higher.** The codebase uses BigInt literals (e.g., `100n`), which require `ES2022` as the minimum TypeScript compilation target.

- **Agent loads environment from the current working directory.** The agent uses `dotenv/config`, which reads `.env` from `process.cwd()`. Always run the agent from the repository root directory to ensure it picks up the correct configuration.

- **Monad chain ID is 143.** This is the mainnet chain ID. Do not confuse it with `10143`, which is incorrect and will cause signed transactions to be rejected by the RPC.

- **Agent wallets are encrypted at rest.** Private keys for agent wallets are encrypted using AES-256-CBC with scrypt-derived keys and stored in the `agentKeyEnc` column. The `AGENT_ENCRYPTION_KEY` environment variable is critical for both encryption and decryption.

---

## Troubleshooting

### "Cannot find module '@nadfun/shared'"

The shared package has not been compiled. Rebuild it:

```bash
npx tsc -p packages/shared/tsconfig.json
```

### "EADDRINUSE port 3001"

Another process is already using port 3001. Find and terminate it:

**Windows:**
```bash
netstat -ano | findstr :3001
taskkill /F /PID <pid>
```

**macOS/Linux:**
```bash
lsof -ti :3001 | xargs kill -9
```

### Prisma Errors

Ensure `DATABASE_URL` is correctly set in **both** `.env` files (root and `packages/db/.env`), then regenerate the client:

```bash
cd packages/db
npx prisma generate
```

If tables are missing, push the schema:

```bash
cd packages/db
npx prisma db push
```

### BigInt Errors in Next.js

If you see errors related to BigInt literals (e.g., `100n`), ensure the Next.js tsconfig has the correct target:

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

Check `apps/web/tsconfig.json` and verify the `target` field.

### Agent Wallet Has 0 Balance

The agent wallet is a system-generated wallet used for automated order execution. It requires MON (Monad's native token) to pay for gas fees. After connecting your wallet and enabling auto-execution in the Settings page, send MON to the agent wallet address displayed there.

### MySQL Connection Refused

Ensure MySQL is running:

**Windows:**
```bash
net start mysql
```

**macOS (Homebrew):**
```bash
brew services start mysql
```

**Linux (systemd):**
```bash
sudo systemctl start mysql
```

### SSE Events Not Arriving in Frontend

Verify that `NEXT_PUBLIC_AGENT_URL` in the root `.env` matches the actual URL where the agent is running. For local development, this should be `http://localhost:3001`. If running behind a proxy or in a container, update accordingly.

---

## Quick Start Summary

For those who want the minimal steps to get running:

```bash
# 1. Clone and install
git clone <repo-url>
cd nadfun-synthetic-limit-order
npm install

# 2. Create .env files (see Environment Variables section above)

# 3. Set up database
mysql -u root -e "CREATE DATABASE nadfun_limit_orders;"
cd packages/db
npx prisma generate
npx prisma db push
cd ../..

# 4. Build shared package
npx tsc -p packages/shared/tsconfig.json

# 5. Start agent (Terminal 1)
npx tsx apps/agent/src/index.ts

# 6. Start frontend (Terminal 2)
cd apps/web
npx next dev --port 3000
```

Open http://localhost:3000 and connect your wallet to begin.
