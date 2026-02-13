'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderbookSearch() {
  const [tokenAddress, setTokenAddress] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = tokenAddress.trim();
    if (addr && addr.startsWith('0x')) {
      router.push(`/orderbook/${addr}`);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Order Book</h1>
      <p className="text-gray-400 text-sm">Enter a token address to view its orderbook.</p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="0x... token address"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-monad-500"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-monad-600 hover:bg-monad-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          disabled={!tokenAddress.trim().startsWith('0x')}
        >
          View
        </button>
      </form>
    </div>
  );
}
