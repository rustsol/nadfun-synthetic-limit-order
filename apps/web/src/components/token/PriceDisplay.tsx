'use client';

import { formatEther } from 'viem';

interface Props {
  label: string;
  amountOut: string;
  isBuy: boolean;
}

export function PriceDisplay({ label, amountOut, isBuy }: Props) {
  const amount = BigInt(amountOut || '0');
  const formatted = amount > 0n ? formatEther(amount) : '—';

  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-mono text-white">
        {isBuy ? (
          <>{formatted} <span className="text-gray-500">tokens/MON</span></>
        ) : (
          <>{formatted} <span className="text-gray-500">MON/token</span></>
        )}
      </p>
    </div>
  );
}
