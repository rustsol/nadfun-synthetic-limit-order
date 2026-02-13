'use client';

import { formatEther } from 'viem';
import { api } from '@/lib/api';

interface Props {
  order: any;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-900/50 text-blue-400',
  TRIGGERED: 'bg-yellow-900/50 text-yellow-400',
  EXECUTED: 'bg-green-900/50 text-green-400',
  EXPIRED: 'bg-gray-800 text-gray-500',
  CANCELLED: 'bg-gray-800 text-gray-500',
  FAILED: 'bg-red-900/50 text-red-400',
};

function formatTrigger(type: string, value: string): string {
  if (type === 'POST_GRADUATION') return 'After graduation';
  if (type.includes('PROGRESS')) {
    const bps = parseInt(value);
    return `${(bps / 100).toFixed(2)}%`;
  }
  if (type === 'TRAILING_STOP' || type === 'TAKE_PROFIT' || type === 'PRICE_DROP_PCT') {
    const bps = parseInt(value);
    return `${(bps / 100).toFixed(1)}%`;
  }
  if (type === 'DCA_INTERVAL') {
    const ms = parseInt(value);
    const hours = ms / 3600000;
    return hours >= 1 ? `Every ${hours}h` : `Every ${ms / 60000}m`;
  }
  if (type === 'MCAP_BELOW_USD' || type === 'MCAP_ABOVE_USD') {
    return `$${parseInt(value).toLocaleString()}`;
  }
  try {
    return `${formatEther(BigInt(value))} MON`;
  } catch {
    return value;
  }
}

const TRIGGER_LABELS: Record<string, string> = {
  PRICE_BELOW: 'Price Below',
  PRICE_ABOVE: 'Price Above',
  PROGRESS_BELOW: 'Progress Below',
  PROGRESS_ABOVE: 'Progress Above',
  POST_GRADUATION: 'Post Graduation',
  MCAP_BELOW: 'MCap Below (MON)',
  MCAP_ABOVE: 'MCap Above (MON)',
  MCAP_BELOW_USD: 'MCap Below (USD)',
  MCAP_ABOVE_USD: 'MCap Above (USD)',
  TRAILING_STOP: 'Trailing Stop',
  TAKE_PROFIT: 'Take Profit',
  DCA_INTERVAL: 'DCA Interval',
  PRICE_DROP_PCT: 'Price Drop %',
};

function shortenHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function OrderCard({ order, onRefresh }: Props) {
  const triggerLog = order.executionLogs?.find((l: any) => l.action === 'TX_CONFIRMED' || l.action === 'TRIGGER');
  const failLog = order.executionLogs?.find((l: any) => l.action === 'TX_FAILED');
  const aiBlockLog = order.executionLogs?.find((l: any) => l.action === 'ABORT' && l.reason?.includes('AI Risk Check'));
  const txHash = order.txHash || triggerLog?.txHash;

  const handleCancel = async () => {
    try {
      await api.cancelOrder(order.id);
      onRefresh?.();
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            order.direction === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {order.direction}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[order.status] || ''}`}>
            {order.status}
          </span>
          {order.status === 'ACTIVE' && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-monad-900/30 text-monad-400 border border-monad-800">
              Auto-Execute
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {new Date(order.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="text-xs font-mono text-gray-400 truncate">
        Token: {order.tokenAddress}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Trigger: </span>
          <span className="text-white">{TRIGGER_LABELS[order.triggerType] || order.triggerType.replace('_', ' ')}</span>
        </div>
        <div>
          <span className="text-gray-500">Target: </span>
          <span className="text-white">{formatTrigger(order.triggerType, order.triggerValue)}</span>
        </div>
        <div>
          <span className="text-gray-500">Amount: </span>
          <span className="text-white">{formatEther(BigInt(order.inputAmount))} {order.direction === 'BUY' ? 'MON' : 'tokens'}</span>
        </div>
        <div>
          <span className="text-gray-500">Slippage: </span>
          <span className="text-white">{order.maxSlippageBps / 100}%</span>
        </div>
      </div>

      {/* Transaction Hash */}
      {txHash && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Tx:</span>
          <a
            href={`https://monadscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-monad-400 hover:text-monad-300 font-mono underline"
          >
            {shortenHash(txHash)}
          </a>
        </div>
      )}

      {/* AI Risk Check blocked */}
      {order.status === 'ACTIVE' && aiBlockLog && (
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-2 space-y-1">
          <p className="text-xs text-yellow-400 font-medium">AI Risk Check Blocked</p>
          <p className="text-xs text-yellow-300/80">{aiBlockLog.reason?.replace('AI Risk Check blocked execution ', '').replace(/^\(.*?\):\s*/, '')}</p>
          <p className="text-[10px] text-gray-500">Disable AI Risk Check in Settings or the header toggle to proceed.</p>
        </div>
      )}

      {/* Failure reason */}
      {order.status === 'FAILED' && failLog?.reason && (
        <div className="bg-red-900/20 rounded-lg p-2 text-xs text-red-400">
          {failLog.reason}
        </div>
      )}

      {/* AI Explanation */}
      {triggerLog?.aiExplanation && (
        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-300">
          <span className="text-monad-400 font-medium">AI: </span>
          {triggerLog.aiExplanation}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'ACTIVE' && (
          <button
            onClick={handleCancel}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
