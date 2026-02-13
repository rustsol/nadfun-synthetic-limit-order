import { formatEther, parseEther } from 'viem';

export function calculatePricePerToken(
  amountInWei: bigint,
  amountOutWei: bigint
): bigint {
  if (amountOutWei === 0n) return 0n;
  return (amountInWei * parseEther('1')) / amountOutWei;
}

export function formatMon(weiAmount: bigint | string): string {
  const val = typeof weiAmount === 'string' ? BigInt(weiAmount) : weiAmount;
  return formatEther(val);
}

export function formatTokenAmount(weiAmount: bigint | string, decimals = 18): string {
  const val = typeof weiAmount === 'string' ? BigInt(weiAmount) : weiAmount;
  const divisor = 10n ** BigInt(decimals);
  const whole = val / divisor;
  const remainder = val % divisor;
  const remainderStr = remainder.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${remainderStr}`;
}

export function formatProgress(progressBps: bigint | string): string {
  const val = typeof progressBps === 'string' ? BigInt(progressBps) : progressBps;
  const percent = Number(val) / 100;
  return `${percent.toFixed(2)}%`;
}
