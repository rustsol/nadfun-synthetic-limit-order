export function applySlippage(amountOut: bigint, maxSlippageBps: number): bigint {
  return (amountOut * BigInt(10000 - maxSlippageBps)) / 10000n;
}

export function checkSlippageAcceptable(
  expectedAmount: bigint,
  freshQuoteAmount: bigint,
  maxSlippageBps: number
): { acceptable: boolean; actualSlippageBps: number } {
  if (expectedAmount === 0n) {
    return { acceptable: false, actualSlippageBps: 10000 };
  }
  const diff = expectedAmount > freshQuoteAmount
    ? expectedAmount - freshQuoteAmount
    : 0n;
  const actualSlippageBps = Number((diff * 10000n) / expectedAmount);
  return {
    acceptable: actualSlippageBps <= maxSlippageBps,
    actualSlippageBps,
  };
}
