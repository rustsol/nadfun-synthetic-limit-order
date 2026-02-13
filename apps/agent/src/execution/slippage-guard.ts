import { applySlippage, checkSlippageAcceptable } from '@nadfun/shared';

export interface SlippageCheckResult {
  acceptable: boolean;
  amountOutMin: bigint;
  actualSlippageBps: number;
}

export function validateSlippage(
  expectedAmountOut: bigint,
  freshAmountOut: bigint,
  maxSlippageBps: number
): SlippageCheckResult {
  const { acceptable, actualSlippageBps } = checkSlippageAcceptable(
    expectedAmountOut,
    freshAmountOut,
    maxSlippageBps
  );

  const amountOutMin = applySlippage(freshAmountOut, maxSlippageBps);

  return {
    acceptable,
    amountOutMin,
    actualSlippageBps,
  };
}
