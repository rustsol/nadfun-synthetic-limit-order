'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatEther } from 'viem';
import { api } from '@/lib/api';
import { useTokenState } from '@/hooks/useTokenState';
import { TokenInfo } from '@/components/token/TokenInfo';
import Link from 'next/link';

interface OrderbookEntry {
  id: string;
  triggerType: string;
  triggerValue: string;
  inputAmount: string;
  maxSlippageBps: number;
  status: string;
  createdAt: string;
}

interface OrderbookData {
  tokenAddress: string;
  buyOrders: OrderbookEntry[];
  sellOrders: OrderbookEntry[];
  totalBuyOrders: number;
  totalSellOrders: number;
}

function formatPrice(value: string, triggerType: string): string {
  if (triggerType === 'POST_GRADUATION') return 'Post-Grad';
  if (triggerType.includes('PROGRESS')) {
    const bps = parseInt(value);
    return `${(bps / 100).toFixed(2)}%`;
  }
  try {
    return parseFloat(formatEther(BigInt(value))).toFixed(8);
  } catch {
    return value;
  }
}

function formatAmount(value: string): string {
  try {
    return parseFloat(formatEther(BigInt(value))).toFixed(4);
  } catch {
    return value;
  }
}

export default function OrderbookPage() {
  const params = useParams();
  const tokenAddress = params.token as string;
  const { data: token } = useTokenState(tokenAddress);
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenAddress) return;
    setLoading(true);
    api.getOrderbook(tokenAddress)
      .then(data => setOrderbook(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.getOrderbook(tokenAddress)
        .then(data => setOrderbook(data))
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [tokenAddress]);

  const allOrders = [...(orderbook?.buyOrders || []), ...(orderbook?.sellOrders || [])];
  const maxAmount = allOrders.reduce((max, o) => {
    try {
      const amt = BigInt(o.inputAmount);
      return amt > max ? amt : max;
    } catch {
      return max;
    }
  }, 1n);

  function getBarWidth(inputAmount: string): string {
    try {
      const pct = Number((BigInt(inputAmount) * 100n) / maxAmount);
      return `${Math.max(pct, 5)}%`;
    } catch {
      return '5%';
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Order Book</h1>
        <Link
          href={`/create`}
          className="px-4 py-2 bg-monad-600 hover:bg-monad-700 text-white text-sm rounded-lg transition"
        >
          + Place Order
        </Link>
      </div>

      <div className="text-sm text-gray-400 font-mono truncate">
        Token: {tokenAddress}
      </div>

      {token && <TokenInfo token={token} />}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading orderbook...</div>
      ) : !orderbook ? (
        <div className="text-center text-gray-500 py-12">Failed to load orderbook</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-green-400">Bids (Buy Orders)</h3>
              <span className="text-xs text-gray-500">{orderbook.totalBuyOrders} orders</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
              <div>Price / Trigger</div>
              <div className="text-right">Amount (MON)</div>
              <div className="text-right">Type</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {orderbook.buyOrders.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-xs">No buy orders</div>
              ) : (
                orderbook.buyOrders.map(order => (
                  <div key={order.id} className="relative grid grid-cols-3 px-4 py-2 text-xs hover:bg-gray-800/30">
                    <div className="absolute inset-y-0 right-0 bg-green-900/15" style={{ width: getBarWidth(order.inputAmount) }} />
                    <div className="relative text-green-400 font-mono">{formatPrice(order.triggerValue, order.triggerType)}</div>
                    <div className="relative text-right text-gray-300 font-mono">{formatAmount(order.inputAmount)}</div>
                    <div className="relative text-right text-gray-500">{order.triggerType.replace('PRICE_', '').replace('PROGRESS_', 'Prog ')}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-400">Asks (Sell Orders)</h3>
              <span className="text-xs text-gray-500">{orderbook.totalSellOrders} orders</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
              <div>Price / Trigger</div>
              <div className="text-right">Amount (Tokens)</div>
              <div className="text-right">Type</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {orderbook.sellOrders.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-xs">No sell orders</div>
              ) : (
                orderbook.sellOrders.map(order => (
                  <div key={order.id} className="relative grid grid-cols-3 px-4 py-2 text-xs hover:bg-gray-800/30">
                    <div className="absolute inset-y-0 right-0 bg-red-900/15" style={{ width: getBarWidth(order.inputAmount) }} />
                    <div className="relative text-red-400 font-mono">{formatPrice(order.triggerValue, order.triggerType)}</div>
                    <div className="relative text-right text-gray-300 font-mono">{formatAmount(order.inputAmount)}</div>
                    <div className="relative text-right text-gray-500">{order.triggerType.replace('PRICE_', '').replace('PROGRESS_', 'Prog ').replace('POST_GRADUATION', 'Grad')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {orderbook && orderbook.buyOrders.length > 0 && orderbook.sellOrders.length > 0 && (
        <div className="text-center text-xs text-gray-500">
          Spread: {(() => {
            try {
              const highestBid = BigInt(orderbook.buyOrders[0].triggerValue);
              const lowestAsk = BigInt(orderbook.sellOrders[0].triggerValue);
              if (highestBid > 0n) {
                const spreadPct = Number((lowestAsk - highestBid) * 10000n / highestBid) / 100;
                return `${spreadPct.toFixed(2)}%`;
              }
            } catch {}
            return '--';
          })()}
        </div>
      )}
    </div>
  );
}
