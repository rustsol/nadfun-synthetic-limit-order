import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { handleSSE } from './events/sse.js';
import {
  getOrdersByWallet,
  getOrderById,
  createOrder,
  cancelOrder,
  updateOrderStatus,
  getOrdersByToken,
} from './db/orders.js';
import { upsertAiConfig, getAiConfig } from './db/ai-config.js';
import {
  createAccount,
  getAccount,
  exportPrivateKey,
} from './db/accounts.js';
import {
  getAgentBalance,
  getTokenBalance,
} from './execution/tx-executor.js';
import type { CreateOrderRequest } from '@nadfun/shared';
import { calculatePricePerToken, formatProgress } from '@nadfun/shared';
import { fetchTokenState } from './monitor/state-fetcher.js';
import { fetchFreshQuote } from './monitor/quote-fetcher.js';
import { formatEther, parseEther, verifyMessage } from 'viem';
import { getExplanation } from './ai/fallback.js';
import {
  buildTokenAnalysisPrompt,
  buildStrategySuggestionPrompt,
  buildChatSystemPrompt,
} from './ai/prompts.js';

// ============ Rate Limiter ============

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup stale entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;
    if (entry.count > maxRequests) {
      res.status(429).json({ error: 'Too many requests. Try again later.' });
      return;
    }
    next();
  };
}

// ============ Signature verification for sensitive endpoints ============

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!isValid) return false;

    // Check message format and timestamp freshness
    const match = message.match(/at (\d+)$/);
    if (!match) return false;
    const timestamp = parseInt(match[1]);
    const age = Date.now() - timestamp;
    return age >= 0 && age < SIGNATURE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Global rate limit: 100 req / 60s per IP
  app.use(createRateLimiter(100, 60_000));

  // Strict rate limit for sensitive endpoints
  const sensitiveLimit = createRateLimiter(5, 60_000);

  // AI rate limit: 10 req / 60s per IP
  const aiLimit = createRateLimiter(10, 60_000);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // SSE events
  app.get('/events', handleSSE);

  // ============ Account / Agent Wallet ============

  app.post('/account', async (req, res) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
      const account = await createAccount(walletAddress);
      res.status(201).json(account);
    } catch (err) {
      console.error('Create account error:', err);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.get('/account', async (req, res) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) return res.status(400).json({ error: 'wallet required' });
      const account = await getAccount(wallet);
      if (!account) return res.status(404).json({ error: 'Account not found' });
      res.json(account);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch account' });
    }
  });

  app.get('/account/balance', async (req, res) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) return res.status(400).json({ error: 'wallet required' });
      const account = await getAccount(wallet);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      const monBalance = await getAgentBalance(account.agentAddress);
      const tokenAddress = req.query.token as string;

      let tokenBalance = '0';
      if (tokenAddress) {
        const bal = await getTokenBalance(tokenAddress, account.agentAddress);
        tokenBalance = bal.toString();
      }

      res.json({
        agentAddress: account.agentAddress,
        monBalance: monBalance.toString(),
        monBalanceFormatted: formatEther(monBalance),
        tokenBalance,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  });

  app.patch('/account/settings', async (req, res) => {
    try {
      const { walletAddress, aiRiskCheck } = req.body;
      if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
      const { prisma } = await import('@nadfun/db');
      const account = await prisma.userAccount.update({
        where: { walletAddress: walletAddress.toLowerCase() },
        data: {
          ...(aiRiskCheck !== undefined ? { aiRiskCheck } : {}),
        },
      });
      res.json(account);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update account settings' });
    }
  });

  app.post('/account/export-key', sensitiveLimit, async (req, res) => {
    try {
      const { walletAddress, message, signature } = req.body;
      if (!walletAddress || !message || !signature) {
        return res.status(400).json({ error: 'walletAddress, message, and signature required' });
      }

      // Verify the wallet owns this address by checking their ECDSA signature
      const isValid = await verifyWalletSignature(walletAddress, message, signature);
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid or expired signature' });
      }

      const key = await exportPrivateKey(walletAddress);
      if (!key) return res.status(404).json({ error: 'Account not found' });
      res.json({ privateKey: key });
    } catch (err) {
      res.status(500).json({ error: 'Failed to export key' });
    }
  });

  // ============ Orders ============

  app.get('/orders', async (req, res) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) return res.status(400).json({ error: 'wallet required' });
      const orders = await getOrdersByWallet(wallet);
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.get('/orders/:id', async (req, res) => {
    try {
      const order = await getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  app.post('/orders', sensitiveLimit, async (req, res) => {
    try {
      const data = req.body as CreateOrderRequest;
      if (!data.walletAddress || !data.tokenAddress || !data.direction || !data.inputAmount || !data.triggerType || !data.triggerValue || !data.expiresAt) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      // Validate token address format
      if (!/^0x[0-9a-fA-F]{40}$/.test(data.tokenAddress)) {
        return res.status(400).json({ error: 'Invalid token address format' });
      }
      // Validate wallet address format
      if (!/^0x[0-9a-fA-F]{40}$/.test(data.walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }
      // Validate direction
      if (!['BUY', 'SELL'].includes(data.direction)) {
        return res.status(400).json({ error: 'Direction must be BUY or SELL' });
      }
      // Validate trigger type
      const validTriggers = ['PRICE_BELOW', 'PRICE_ABOVE', 'PROGRESS_BELOW', 'PROGRESS_ABOVE', 'POST_GRADUATION', 'MCAP_BELOW', 'MCAP_ABOVE', 'MCAP_BELOW_USD', 'MCAP_ABOVE_USD', 'TRAILING_STOP', 'TAKE_PROFIT', 'STOP_LOSS', 'DCA_INTERVAL', 'PRICE_DROP_PCT'];
      if (!validTriggers.includes(data.triggerType)) {
        return res.status(400).json({ error: `Invalid trigger type: ${data.triggerType}` });
      }
      // Validate inputAmount is a positive numeric string
      if (!/^\d+$/.test(data.inputAmount) || data.inputAmount === '0') {
        return res.status(400).json({ error: 'inputAmount must be a positive numeric string in wei' });
      }
      // Validate triggerValue is a numeric string
      if (!/^\d+$/.test(data.triggerValue)) {
        return res.status(400).json({ error: 'triggerValue must be a numeric string' });
      }
      // Validate expiresAt is in the future
      if (new Date(data.expiresAt) <= new Date()) {
        return res.status(400).json({ error: 'expiresAt must be in the future' });
      }
      // Validate maxSlippageBps range (1-5000 bps = 0.01%-50%)
      if (data.maxSlippageBps !== undefined && (data.maxSlippageBps < 1 || data.maxSlippageBps > 5000)) {
        return res.status(400).json({ error: 'maxSlippageBps must be between 1 and 5000' });
      }
      const order = await createOrder(data);
      res.status(201).json(order);
    } catch (err) {
      console.error('Create order error:', err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.patch('/orders/:id/cancel', async (req, res) => {
    try {
      const order = await cancelOrder(req.params.id);
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  });

  app.post('/orders/:id/confirm', async (req, res) => {
    try {
      const { txHash } = req.body;
      const order = await updateOrderStatus(req.params.id, 'EXECUTED', undefined, txHash);
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to confirm order' });
    }
  });

  // ============ Orderbook ============

  app.get('/orderbook/:token', async (req, res) => {
    try {
      const tokenAddress = req.params.token.toLowerCase();
      const orders = await getOrdersByToken(tokenAddress);

      const buyOrders = orders
        .filter(o => o.direction === 'BUY')
        .map(o => ({
          id: o.id,
          triggerType: o.triggerType,
          triggerValue: o.triggerValue,
          inputAmount: o.inputAmount,
          maxSlippageBps: o.maxSlippageBps,
          status: o.status,
          createdAt: o.createdAt,
        }))
        .sort((a, b) => {
          try {
            return Number(BigInt(b.triggerValue) - BigInt(a.triggerValue));
          } catch {
            return 0;
          }
        });

      const sellOrders = orders
        .filter(o => o.direction === 'SELL')
        .map(o => ({
          id: o.id,
          triggerType: o.triggerType,
          triggerValue: o.triggerValue,
          inputAmount: o.inputAmount,
          maxSlippageBps: o.maxSlippageBps,
          status: o.status,
          createdAt: o.createdAt,
        }))
        .sort((a, b) => {
          try {
            return Number(BigInt(a.triggerValue) - BigInt(b.triggerValue));
          } catch {
            return 0;
          }
        });

      res.json({
        tokenAddress,
        buyOrders,
        sellOrders,
        totalBuyOrders: buyOrders.length,
        totalSellOrders: sellOrders.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch orderbook' });
    }
  });

  // ============ Token State ============

  app.get('/token/:address', async (req, res) => {
    try {
      const state = await fetchTokenState(req.params.address);
      res.json({
        ...state,
        progress: state.progress.toString(),
        totalSupply: state.totalSupply.toString(),
        buyAmountOut: state.buyAmountOut.toString(),
        sellAmountOut: state.sellAmountOut.toString(),
        nadMarket: state.nadMarket ?? null,
      });
    } catch (err) {
      console.error('Token state error:', err);
      res.status(500).json({ error: 'Failed to fetch token state' });
    }
  });

  // ============ Quote ============

  app.get('/quote', async (req, res) => {
    try {
      const { token, amount, isBuy } = req.query;
      if (!token || !amount) return res.status(400).json({ error: 'token and amount required' });
      const quote = await fetchFreshQuote(
        token as string,
        BigInt(amount as string),
        isBuy === 'true'
      );
      res.json({
        router: quote.router,
        amountOut: quote.amountOut.toString(),
        timestamp: quote.timestamp,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch quote' });
    }
  });

  // ============ AI Config ============

  app.get('/ai-config', async (req, res) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) return res.status(400).json({ error: 'wallet required' });
      const config = await getAiConfig(wallet);
      res.json({
        preferred: config.preferred,
        hasGroq: !!config.groqApiKey,
        hasClaude: !!config.claudeApiKey,
        hasOpenai: !!config.openaiApiKey,
        hasGemini: !!config.geminiApiKey,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch AI config' });
    }
  });

  app.post('/ai-config', async (req, res) => {
    try {
      const { walletAddress, ...data } = req.body;
      if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
      await upsertAiConfig(walletAddress, data);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update AI config' });
    }
  });

  // ============ AI Features ============

  // Token Analysis
  app.get('/ai/analyze/:token', aiLimit, async (req, res) => {
    try {
      const wallet = req.query.wallet as string;
      if (!wallet) return res.status(400).json({ error: 'wallet required' });

      const state = await fetchTokenState(req.params.token as string);
      const aiConfig = await getAiConfig(wallet);

      const oneToken = parseEther('1');
      const currentPrice = calculatePricePerToken(oneToken, state.buyAmountOut);

      const prompt = buildTokenAnalysisPrompt({
        tokenAddress: state.tokenAddress,
        name: state.name,
        symbol: state.symbol,
        currentPrice: formatEther(currentPrice),
        progress: formatProgress(state.progress),
        isGraduated: state.isGraduated,
        isLocked: state.isLocked,
        totalSupply: formatEther(state.totalSupply),
        marketCap: state.nadMarket?.reserve_native ? formatEther(BigInt(parseFloat(state.nadMarket.reserve_native) * 1e18)) : undefined,
        volume: state.nadMarket?.volume ? formatEther(BigInt(state.nadMarket.volume)) : undefined,
        holderCount: state.nadMarket?.holder_count,
        athPrice: state.nadMarket?.ath_price,
        priceUsd: state.nadMarket?.price_usd,
      });

      const result = await getExplanation(prompt, aiConfig);
      res.json({
        analysis: result.text,
        provider: result.provider,
        token: {
          name: state.name,
          symbol: state.symbol,
          price: formatEther(currentPrice),
          progress: formatProgress(state.progress),
          isGraduated: state.isGraduated,
        },
      });
    } catch (err) {
      console.error('Token analysis error:', err);
      res.status(500).json({ error: 'Failed to analyze token' });
    }
  });

  // Strategy Suggestions
  app.post('/ai/suggest-strategy', aiLimit, async (req, res) => {
    try {
      const { tokenAddress, direction, inputAmount, wallet } = req.body;
      if (!tokenAddress || !direction || !wallet) {
        return res.status(400).json({ error: 'tokenAddress, direction, and wallet required' });
      }

      const state = await fetchTokenState(tokenAddress);
      const aiConfig = await getAiConfig(wallet);

      const oneToken = parseEther('1');
      const currentPrice = calculatePricePerToken(oneToken, state.buyAmountOut);

      const prompt = buildStrategySuggestionPrompt({
        tokenAddress: state.tokenAddress,
        name: state.name,
        symbol: state.symbol,
        direction,
        inputAmount: inputAmount || '1',
        currentPrice: formatEther(currentPrice),
        progress: formatProgress(state.progress),
        isGraduated: state.isGraduated,
        marketCap: state.nadMarket?.reserve_native ? formatEther(BigInt(parseFloat(state.nadMarket.reserve_native) * 1e18)) : undefined,
        volume: state.nadMarket?.volume ? formatEther(BigInt(state.nadMarket.volume)) : undefined,
        holderCount: state.nadMarket?.holder_count,
        athPrice: state.nadMarket?.ath_price,
      });

      const result = await getExplanation(prompt, aiConfig);

      // Try to parse the JSON suggestion
      let suggestion: any = null;
      try {
        suggestion = JSON.parse(result.text);
      } catch {
        // AI didn't return valid JSON, return raw text
      }

      res.json({
        suggestion,
        rawText: result.text,
        provider: result.provider,
        currentPrice: formatEther(currentPrice),
      });
    } catch (err) {
      console.error('Strategy suggestion error:', err);
      res.status(500).json({ error: 'Failed to generate strategy suggestion' });
    }
  });

  // AI Chat
  app.post('/ai/chat', aiLimit, async (req, res) => {
    try {
      const { wallet, messages } = req.body;
      if (!wallet || !messages?.length) {
        return res.status(400).json({ error: 'wallet and messages required' });
      }

      const aiConfig = await getAiConfig(wallet);

      // Build context for the system prompt
      const orders = await getOrdersByWallet(wallet);
      const account = await getAccount(wallet);
      let monBalance: string | undefined;
      if (account) {
        const balance = await getAgentBalance(account.agentAddress);
        monBalance = formatEther(balance);
      }

      const systemPrompt = buildChatSystemPrompt({
        activeOrders: orders
          .filter((o: any) => o.status === 'ACTIVE')
          .map((o: any) => ({
            id: o.id,
            tokenAddress: o.tokenAddress,
            direction: o.direction,
            triggerType: o.triggerType,
            status: o.status,
            inputAmount: o.inputAmount,
            triggerValue: o.triggerValue,
          })),
        agentAddress: account?.agentAddress,
        monBalance,
        walletAddress: wallet,
      });

      // Prepend system message, then pass user's conversation
      const aiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const result = await getExplanation(aiMessages, aiConfig);
      let responseText = result.text;
      const actions: Array<{ type: string; result: any }> = [];

      // Parse and execute ACTION lines from AI response
      const actionLines = responseText.match(/^ACTION:(CREATE_ORDER|CANCEL_ORDER):(.+)$/gm);
      if (actionLines) {
        for (const line of actionLines) {
          const match = line.match(/^ACTION:(CREATE_ORDER|CANCEL_ORDER):(.+)$/);
          if (!match) continue;
          const [, actionType, jsonStr] = match;

          try {
            const payload = JSON.parse(jsonStr);

            if (actionType === 'CREATE_ORDER') {
              // Validate required fields
              if (!payload.tokenAddress || !payload.direction || !payload.triggerType || !payload.triggerValue || !payload.inputAmount) {
                actions.push({ type: 'CREATE_ORDER', result: { error: 'Missing required order fields' } });
                continue;
              }
              // Validate token address is a real Ethereum address (0x + 40 hex chars)
              if (!/^0x[0-9a-fA-F]{40}$/.test(payload.tokenAddress)) {
                actions.push({ type: 'CREATE_ORDER', result: { error: `Invalid token address: "${payload.tokenAddress}". Must be a valid 0x address.` } });
                continue;
              }
              // Validate direction
              if (!['BUY', 'SELL'].includes(payload.direction)) {
                actions.push({ type: 'CREATE_ORDER', result: { error: `Invalid direction: "${payload.direction}". Must be BUY or SELL.` } });
                continue;
              }
              // Validate triggerValue and inputAmount are numeric strings
              if (!/^\d+$/.test(payload.triggerValue)) {
                actions.push({ type: 'CREATE_ORDER', result: { error: `Invalid triggerValue: "${payload.triggerValue}". Must be a numeric string.` } });
                continue;
              }
              if (!/^\d+$/.test(payload.inputAmount)) {
                actions.push({ type: 'CREATE_ORDER', result: { error: `Invalid inputAmount: "${payload.inputAmount}". Must be a numeric string in wei.` } });
                continue;
              }
              // Ensure expiresAt is in the future, default to 7 days
              const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              let expiresAt = defaultExpiry;
              if (payload.expiresAt) {
                const parsed = new Date(payload.expiresAt);
                expiresAt = (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) ? parsed.toISOString() : defaultExpiry;
              }

              const orderData: CreateOrderRequest = {
                walletAddress: wallet,
                tokenAddress: payload.tokenAddress.toLowerCase(),
                direction: payload.direction,
                triggerType: payload.triggerType,
                triggerValue: payload.triggerValue,
                inputAmount: payload.inputAmount,
                maxSlippageBps: payload.maxSlippageBps || 300,
                expiresAt,
                referencePrice: payload.referencePrice,
                peakPrice: payload.peakPrice,
              };
              const order = await createOrder(orderData);
              actions.push({ type: 'CREATE_ORDER', result: { success: true, orderId: order.id, ...orderData } });
              console.log(`[AI Chat] Created order ${order.id} for ${wallet} via AI chat`);
            } else if (actionType === 'CANCEL_ORDER') {
              if (!payload.orderId) {
                actions.push({ type: 'CANCEL_ORDER', result: { error: 'Missing orderId' } });
                continue;
              }
              const order = await cancelOrder(payload.orderId);
              actions.push({ type: 'CANCEL_ORDER', result: { success: true, orderId: payload.orderId } });
              console.log(`[AI Chat] Cancelled order ${payload.orderId} for ${wallet} via AI chat`);
            }
          } catch (actionErr: any) {
            console.error(`[AI Chat] Action ${actionType} failed:`, actionErr);
            actions.push({ type: actionType, result: { error: actionErr.message || 'Action failed' } });
          }

          // Remove the ACTION line from the response shown to user
          responseText = responseText.replace(line, '').trim();
        }
      }

      res.json({
        response: responseText,
        provider: result.provider,
        actions,
      });
    } catch (err) {
      console.error('AI chat error:', err);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  return app;
}
