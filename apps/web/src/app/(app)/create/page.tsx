'use client';

import { useState } from 'react';
import { TokenSearch } from '@/components/token/TokenSearch';
import { TokenInfo } from '@/components/token/TokenInfo';
import { OrderForm } from '@/components/order/OrderForm';
import { useTokenState } from '@/hooks/useTokenState';
import Link from 'next/link';

export default function CreateOrderPage() {
  const [tokenAddress, setTokenAddress] = useState('');
  const { data: token, loading, error } = useTokenState(tokenAddress);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Create Limit Order</h1>

      <div className="space-y-2">
        <label className="block text-sm text-gray-400">Token Address</label>
        <TokenSearch onSelect={setTokenAddress} value={tokenAddress} />
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-8">Loading token data...</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {token && (
        <>
          <div className="flex items-center justify-between">
            <TokenInfo token={token} />
          </div>
          <Link
            href={`/orderbook/${tokenAddress}`}
            className="block text-center text-sm text-monad-400 hover:text-monad-300 transition"
          >
            View Orderbook for {token.symbol}
          </Link>
          <OrderForm token={token} />
        </>
      )}
    </div>
  );
}
