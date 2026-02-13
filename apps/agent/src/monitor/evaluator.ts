import type { Order } from '@nadfun/db';
import type { TokenChainState } from './state-fetcher.js';
import { calculatePricePerToken } from '@nadfun/shared';
import { parseEther } from 'viem';

export interface EvalResult {
  triggered: boolean;
  reason: string;
  abort: boolean;
  abortReason?: string;
}

export function evaluateOrder(order: Order, state: TokenChainState): EvalResult {
  const now = new Date();
  if (now >= order.expiresAt) {
    return { triggered: false, reason: 'Order expired', abort: false };
  }

  // Safety: don't trigger on invalid state (failed RPC / unknown token)
  if (state.name === 'Unknown' && state.progress === 0n && state.buyAmountOut === 0n) {
    return {
      triggered: false,
      reason: 'Token state unavailable — skipping evaluation',
      abort: false,
    };
  }

  if (order.direction === 'BUY' && state.isLocked) {
    return {
      triggered: false,
      reason: 'Token is locked — buy orders cannot execute',
      abort: true,
      abortReason: 'Token is currently locked on the bonding curve',
    };
  }

  if (order.direction === 'BUY' && state.isGraduated
    && order.triggerType !== 'POST_GRADUATION'
    && order.triggerType !== 'MCAP_BELOW'
    && order.triggerType !== 'DCA_INTERVAL'
    && order.triggerType !== 'PRICE_DROP_PCT') {
    return {
      triggered: false,
      reason: 'Token has graduated — bonding curve buy orders no longer valid',
      abort: true,
      abortReason: 'Token graduated to DEX during monitoring',
    };
  }

  const oneToken = parseEther('1');
  const currentPrice = order.direction === 'BUY'
    ? calculatePricePerToken(oneToken, state.buyAmountOut)
    : calculatePricePerToken(state.sellAmountOut, oneToken);

  const triggerValue = BigInt(order.triggerValue);

  switch (order.triggerType) {
    case 'PRICE_BELOW': {
      if (currentPrice <= triggerValue) {
        return {
          triggered: true,
          reason: `Price ${currentPrice} <= target ${triggerValue} — buy condition met`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Price ${currentPrice} > target ${triggerValue} — waiting`,
        abort: false,
      };
    }

    case 'PRICE_ABOVE': {
      if (currentPrice >= triggerValue) {
        return {
          triggered: true,
          reason: `Price ${currentPrice} >= target ${triggerValue} — sell condition met`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Price ${currentPrice} < target ${triggerValue} — waiting`,
        abort: false,
      };
    }

    case 'PROGRESS_BELOW': {
      if (state.progress <= triggerValue) {
        return {
          triggered: true,
          reason: `Progress ${state.progress} <= target ${triggerValue} — buy condition met`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Progress ${state.progress} > target ${triggerValue} — waiting`,
        abort: false,
      };
    }

    case 'PROGRESS_ABOVE': {
      if (state.progress >= triggerValue) {
        return {
          triggered: true,
          reason: `Progress ${state.progress} >= target ${triggerValue} — sell condition met`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Progress ${state.progress} < target ${triggerValue} — waiting`,
        abort: false,
      };
    }

    case 'POST_GRADUATION': {
      if (state.isGraduated) {
        return {
          triggered: true,
          reason: 'Token has graduated to DEX — post-graduation sell triggered',
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: 'Token has not graduated yet — waiting',
        abort: false,
      };
    }

    case 'MCAP_BELOW': {
      const marketCap = (currentPrice * state.totalSupply) / parseEther('1');
      if (marketCap <= triggerValue) {
        return {
          triggered: true,
          reason: `Market cap ${marketCap} <= target ${triggerValue} — buy condition met`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Market cap ${marketCap} > target ${triggerValue} — waiting`,
        abort: false,
      };
    }

    case 'MCAP_ABOVE': {
      const marketCap = (currentPrice * state.totalSupply) / parseEther('1');
      if (marketCap >= triggerValue) {
        return {
          triggered: true,
          reason: `Market cap ${marketCap} >= target ${triggerValue} — sell condition met`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Market cap ${marketCap} < target ${triggerValue} — waiting`,
        abort: false,
      };
    }

    case 'TRAILING_STOP': {
      const peakPrice = BigInt(order.peakPrice || '0');
      const threshold = (peakPrice * (10000n - triggerValue)) / 10000n;
      if (currentPrice <= threshold) {
        return {
          triggered: true,
          reason: `Price ${currentPrice} <= trailing threshold ${threshold} (peak ${peakPrice}, drop ${triggerValue} bps) — sell triggered`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Price ${currentPrice} > trailing threshold ${threshold} — waiting`,
        abort: false,
      };
    }

    case 'TAKE_PROFIT': {
      const refPrice = BigInt(order.referencePrice || '0');
      const threshold = (refPrice * (10000n + triggerValue)) / 10000n;
      if (currentPrice >= threshold) {
        return {
          triggered: true,
          reason: `Price ${currentPrice} >= take-profit threshold ${threshold} (ref ${refPrice}, gain ${triggerValue} bps) — sell triggered`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Price ${currentPrice} < take-profit threshold ${threshold} — waiting`,
        abort: false,
      };
    }

    case 'STOP_LOSS': {
      const refPrice = BigInt(order.referencePrice || '0');
      const threshold = (refPrice * (10000n - triggerValue)) / 10000n;
      if (currentPrice <= threshold) {
        return {
          triggered: true,
          reason: `Price ${currentPrice} <= stop-loss threshold ${threshold} (ref ${refPrice}, loss ${triggerValue} bps) — sell triggered`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Price ${currentPrice} > stop-loss threshold ${threshold} — waiting`,
        abort: false,
      };
    }

    case 'DCA_INTERVAL': {
      const lastExec = order.lastExecutedAt ? new Date(order.lastExecutedAt).getTime() : 0;
      const elapsed = Date.now() - lastExec;
      const intervalMs = Number(triggerValue);
      if (elapsed >= intervalMs) {
        return {
          triggered: true,
          reason: `DCA interval elapsed: ${elapsed}ms >= ${intervalMs}ms — buy triggered`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `DCA interval not yet reached: ${elapsed}ms < ${intervalMs}ms — waiting`,
        abort: false,
      };
    }

    case 'PRICE_DROP_PCT': {
      const refPrice = BigInt(order.referencePrice || '0');
      const threshold = (refPrice * (10000n - triggerValue)) / 10000n;
      if (currentPrice <= threshold) {
        return {
          triggered: true,
          reason: `Price ${currentPrice} <= drop threshold ${threshold} (ref ${refPrice}, drop ${triggerValue} bps) — buy triggered`,
          abort: false,
        };
      }
      return {
        triggered: false,
        reason: `Price ${currentPrice} > drop threshold ${threshold} — waiting`,
        abort: false,
      };
    }

    default:
      return {
        triggered: false,
        reason: `Unknown trigger type: ${order.triggerType}`,
        abort: false,
      };
  }
}
