import { CONTRACTS, lensAbi } from '@nadfun/shared';
import { publicClient } from '../chain/client.js';

export interface FreshQuote {
  router: string;
  amountOut: bigint;
  timestamp: number;
}

export async function fetchFreshQuote(
  tokenAddress: string,
  amountIn: bigint,
  isBuy: boolean
): Promise<FreshQuote> {
  const result = await publicClient.readContract({
    address: CONTRACTS.LENS as `0x${string}`,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, amountIn, isBuy],
  });

  const [router, amountOut] = result as [string, bigint];

  return {
    router,
    amountOut,
    timestamp: Date.now(),
  };
}
