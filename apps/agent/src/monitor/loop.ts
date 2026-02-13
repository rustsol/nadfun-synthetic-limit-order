import { formatEther, parseEther } from 'viem';
import { calculatePricePerToken, formatProgress } from '@nadfun/shared';
import type { OrderTriggeredEvent } from '@nadfun/shared';
import { getActiveOrders, updateOrderStatus, updatePeakPrice, reactivateDcaOrder } from '../db/orders.js';
import { writeExecutionLog } from '../db/logs.js';
import { getAiConfig } from '../db/ai-config.js';
import { getAgentPrivateKey } from '../db/accounts.js';
import { fetchBatchTokenStates } from './state-fetcher.js';
import { evaluateOrder } from './evaluator.js';
import { fetchFreshQuote } from './quote-fetcher.js';
import { selectRouter } from '../execution/router-selector.js';
import { validateSlippage } from '../execution/slippage-guard.js';
import { buildUnsignedTx } from '../execution/tx-builder.js';
import { executeTransaction, ensureApproval, getTokenBalance } from '../execution/tx-executor.js';
import { getExplanation } from '../ai/fallback.js';
import { buildExplanationPrompt } from '../ai/prompts.js';
import { performRiskCheck } from '../ai/risk-check.js';
import { agentEvents } from '../events/emitter.js';

const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL_MS || '5000');
let isRunning = false;
let loopTimer: ReturnType<typeof setInterval> | null = null;

async function processOrders() {
  if (isRunning) return;
  isRunning = true;

  try {
    const orders = await getActiveOrders();
    if (orders.length === 0) return;

    const tokenAddresses = orders.map(o => o.tokenAddress);
    const states = await fetchBatchTokenStates(tokenAddresses);

    for (const order of orders) {
      try {
        const state = states.get(order.tokenAddress.toLowerCase());
        if (!state) {
          console.warn(`No state for token ${order.tokenAddress}`);
          continue;
        }

        // Check expiration
        if (new Date() >= order.expiresAt) {
          await updateOrderStatus(order.id, 'EXPIRED');
          await writeExecutionLog({
            orderId: order.id,
            action: 'EXPIRE',
            reason: 'Order expired',
          });
          agentEvents.emitOrderExpired(order.id, order.walletAddress);
          continue;
        }

        const evalResult = evaluateOrder(order, state);

        if (evalResult.abort) {
          await writeExecutionLog({
            orderId: order.id,
            action: 'ABORT',
            currentPrice: state.buyAmountOut.toString(),
            currentProgress: state.progress.toString(),
            isGraduated: state.isGraduated,
            isLocked: state.isLocked,
            reason: evalResult.abortReason || evalResult.reason,
          });
          agentEvents.emitOrderAborted(order.id, order.walletAddress, evalResult.abortReason || evalResult.reason);
          continue;
        }

        if (!evalResult.triggered) {
          // TRAILING_STOP: update peakPrice if current price exceeds tracked peak
          if (order.triggerType === 'TRAILING_STOP') {
            const oneToken = parseEther('1');
            const cp = order.direction === 'SELL'
              ? calculatePricePerToken(state.sellAmountOut, oneToken)
              : calculatePricePerToken(oneToken, state.buyAmountOut);
            const currentPeak = BigInt(order.peakPrice || '0');
            if (cp > currentPeak) {
              await updatePeakPrice(order.id, cp.toString());
            }
          }
          continue;
        }

        // Triggered! Re-fetch fresh quote
        const isBuy = order.direction === 'BUY';
        let inputAmount = BigInt(order.inputAmount);

        // Fetch agent account early — needed for sell balance check and tx execution
        const { prisma } = await import('@nadfun/db');
        const userAccount = await prisma.userAccount.findUnique({
          where: { walletAddress: order.walletAddress },
        });

        // For SELL orders: cap inputAmount to actual token balance
        if (!isBuy && userAccount) {
          const tokenBalance = await getTokenBalance(order.tokenAddress, userAccount.agentAddress);
          if (tokenBalance === 0n) {
            await writeExecutionLog({
              orderId: order.id,
              action: 'ABORT',
              reason: 'Agent wallet has 0 token balance — nothing to sell',
            });
            await updateOrderStatus(order.id, 'FAILED');
            console.warn(`Order ${order.id}: agent has 0 token balance, marking FAILED`);
            continue;
          }
          if (tokenBalance < inputAmount) {
            console.log(`Order ${order.id}: balance ${tokenBalance} < order amount ${inputAmount}, selling available balance`);
            inputAmount = tokenBalance;
          }
        }

        const freshQuote = await fetchFreshQuote(
          order.tokenAddress,
          inputAmount,
          isBuy
        );

        // Safety: don't execute if fresh quote returns 0
        if (freshQuote.amountOut === 0n) {
          await writeExecutionLog({
            orderId: order.id,
            action: 'ABORT',
            reason: 'Fresh quote returned 0 amountOut — token state may be invalid',
          });
          console.warn(`Order ${order.id}: fresh quote returned 0 amountOut, skipping`);
          continue;
        }

        // Router selection
        const router = selectRouter(freshQuote.router);

        // Slippage check: estimate expected output from evaluation-time price, compare to fresh quote
        // State amountOut is per 1 token (1e18 wei input), scale linearly to inputAmount
        const oneUnit = parseEther('1');
        const stateAmountOut = isBuy ? state.buyAmountOut : state.sellAmountOut;
        const expectedOutput = stateAmountOut > 0n
          ? (stateAmountOut * inputAmount) / oneUnit
          : freshQuote.amountOut; // fallback: skip slippage check if no state price
        const slippageResult = validateSlippage(
          expectedOutput,
          freshQuote.amountOut,
          order.maxSlippageBps
        );

        if (!slippageResult.acceptable) {
          await writeExecutionLog({
            orderId: order.id,
            action: 'ABORT',
            currentPrice: state.buyAmountOut.toString(),
            currentProgress: state.progress.toString(),
            isGraduated: state.isGraduated,
            isLocked: state.isLocked,
            routerAddress: freshQuote.router,
            reason: `Slippage too high: ${slippageResult.actualSlippageBps / 100}% > max ${order.maxSlippageBps / 100}%`,
          });
          continue;
        }

        // AI Pre-Execution Risk Check (opt-in)
        if (userAccount?.aiRiskCheck) {
          try {
            const aiConfig = await getAiConfig(order.walletAddress);
            const riskResult = await performRiskCheck({
              tokenSymbol: state.symbol,
              tokenName: state.name,
              direction: order.direction,
              triggerType: order.triggerType,
              inputAmount: formatEther(inputAmount),
              estimatedOutput: formatEther(freshQuote.amountOut),
              currentPrice: formatEther(isBuy
                ? calculatePricePerToken(parseEther('1'), state.buyAmountOut)
                : calculatePricePerToken(state.sellAmountOut, parseEther('1'))),
              slippageBps: order.maxSlippageBps,
              isGraduated: state.isGraduated,
              progress: formatProgress(state.progress),
              volume: state.nadMarket?.volume ? formatEther(BigInt(state.nadMarket.volume)) : undefined,
              holderCount: state.nadMarket?.holder_count,
            }, aiConfig);

            if (!riskResult.execute && riskResult.confidence > 0.7) {
              await writeExecutionLog({
                orderId: order.id,
                action: 'ABORT',
                currentPrice: state.buyAmountOut.toString(),
                currentProgress: state.progress.toString(),
                isGraduated: state.isGraduated,
                isLocked: state.isLocked,
                reason: `AI Risk Check blocked execution (confidence: ${(riskResult.confidence * 100).toFixed(0)}%): ${riskResult.reasoning}`,
                aiProvider: riskResult.provider,
              });
              console.log(`Order ${order.id}: AI risk check blocked — ${riskResult.reasoning}`);
              continue;
            }

            if (riskResult.reasoning) {
              console.log(`Order ${order.id}: AI risk check passed (${riskResult.provider}): ${riskResult.reasoning.slice(0, 80)}`);
            }
          } catch (err) {
            // Fail-open: if risk check fails, proceed with execution
            console.warn(`Order ${order.id}: AI risk check failed (proceeding):`, err);
          }
        }

        // Get the agent private key for this user
        const agentPrivateKey = await getAgentPrivateKey(order.walletAddress);

        if (!agentPrivateKey || !userAccount) {
          // No agent wallet — mark as TRIGGERED (legacy notify-only)
          await updateOrderStatus(order.id, 'TRIGGERED', freshQuote.router);
          await writeExecutionLog({
            orderId: order.id,
            action: 'TRIGGER',
            currentPrice: state.buyAmountOut.toString(),
            currentProgress: state.progress.toString(),
            isGraduated: state.isGraduated,
            isLocked: state.isLocked,
            routerAddress: freshQuote.router,
            reason: 'No agent wallet configured — manual execution required',
          });
          continue;
        }

        const unsignedTx = buildUnsignedTx({
          direction: order.direction as 'BUY' | 'SELL',
          routerType: router.type,
          inputAmount,
          amountOutMin: slippageResult.amountOutMin,
          tokenAddress: order.tokenAddress,
          userAddress: userAccount.agentAddress,
        });

        // Get AI explanation (non-blocking best effort)
        const oneToken = parseEther('1');
        const currentPrice = isBuy
          ? calculatePricePerToken(oneToken, state.buyAmountOut)
          : calculatePricePerToken(state.sellAmountOut, oneToken);

        let aiExplanation = 'AI explanation unavailable.';
        let aiProvider = 'none';

        try {
          const aiConfig = await getAiConfig(order.walletAddress);
          const prompt = buildExplanationPrompt({
            tokenAddress: order.tokenAddress,
            tokenName: state.name,
            tokenSymbol: state.symbol,
            direction: order.direction,
            triggerType: order.triggerType,
            triggerValue: order.triggerValue,
            currentPrice: formatEther(currentPrice),
            currentProgress: formatProgress(state.progress),
            isGraduated: state.isGraduated,
            isLocked: state.isLocked,
            routerUsed: router.type === 'dex' ? 'DexRouter' : 'BondingCurveRouter',
            slippageBps: order.maxSlippageBps,
            inputAmount: formatEther(inputAmount),
            estimatedOutput: formatEther(freshQuote.amountOut),
          });
          const result = await getExplanation(prompt, aiConfig);
          aiExplanation = result.text;
          aiProvider = result.provider;
        } catch (err) {
          console.warn('AI explanation failed:', err);
        }

        // For SELL orders: ensure the router is approved to spend tokens
        if (!isBuy) {
          const routerAddress = router.type === 'dex'
            ? (await import('@nadfun/shared')).CONTRACTS.DEX_ROUTER
            : (await import('@nadfun/shared')).CONTRACTS.BONDING_CURVE_ROUTER;

          const approvalResult = await ensureApproval(
            agentPrivateKey,
            order.tokenAddress,
            routerAddress,
            inputAmount
          );

          if (!approvalResult.approved) {
            await writeExecutionLog({
              orderId: order.id,
              action: 'ABORT',
              reason: `Token approval failed: ${approvalResult.error}`,
            });
            console.warn(`Order ${order.id}: approval failed — ${approvalResult.error}`);
            continue;
          }
        }

        // AUTO-EXECUTE: Sign and send the transaction
        console.log(`Executing order ${order.id} for ${state.symbol} (${order.direction})...`);

        await updateOrderStatus(order.id, 'TRIGGERED', freshQuote.router);

        const txResult = await executeTransaction(agentPrivateKey, unsignedTx);

        if (txResult.success && txResult.txHash !== '0x') {
          // Transaction succeeded
          await updateOrderStatus(order.id, 'EXECUTED', freshQuote.router, txResult.txHash);
          await writeExecutionLog({
            orderId: order.id,
            action: 'TX_CONFIRMED',
            currentPrice: currentPrice.toString(),
            currentProgress: state.progress.toString(),
            isGraduated: state.isGraduated,
            isLocked: state.isLocked,
            routerAddress: freshQuote.router,
            unsignedTxData: unsignedTx,
            txHash: txResult.txHash,
            aiExplanation,
            aiProvider,
            reason: evalResult.reason,
          });

          agentEvents.emitOrderExecuted({
            orderId: order.id,
            walletAddress: order.walletAddress,
            txHash: txResult.txHash,
            tokenAddress: order.tokenAddress,
            direction: order.direction,
          });

          // DCA_INTERVAL: re-activate order for next interval instead of leaving as EXECUTED
          if (order.triggerType === 'DCA_INTERVAL') {
            await reactivateDcaOrder(order.id);
            console.log(`Order ${order.id} DCA re-activated for next interval`);
          }

          console.log(`Order ${order.id} EXECUTED: tx ${txResult.txHash}`);
        } else {
          // Transaction failed
          await updateOrderStatus(order.id, 'FAILED', freshQuote.router);
          await writeExecutionLog({
            orderId: order.id,
            action: 'TX_FAILED',
            currentPrice: currentPrice.toString(),
            currentProgress: state.progress.toString(),
            isGraduated: state.isGraduated,
            isLocked: state.isLocked,
            routerAddress: freshQuote.router,
            unsignedTxData: unsignedTx,
            aiExplanation,
            aiProvider,
            reason: txResult.error || 'Transaction execution failed',
          });

          agentEvents.emitOrderFailed({
            orderId: order.id,
            walletAddress: order.walletAddress,
            reason: txResult.error || 'Transaction execution failed',
          });

          console.log(`Order ${order.id} FAILED: ${txResult.error}`);
        }
      } catch (err) {
        console.error(`Error processing order ${order.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Monitor loop error:', err);
  } finally {
    isRunning = false;
  }
}

export function startMonitorLoop() {
  console.log(`Starting monitor loop (interval: ${MONITOR_INTERVAL}ms)`);
  processOrders();
  loopTimer = setInterval(processOrders, MONITOR_INTERVAL);
}

export function stopMonitorLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}
