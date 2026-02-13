'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { api } from '@/lib/api';

export function Header() {
  const { address } = useAccount();
  const [aiRiskCheck, setAiRiskCheck] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!address) { setHasAccount(false); return; }
    api.getAccount(address).then(account => {
      setHasAccount(true);
      setAiRiskCheck(!!account.aiRiskCheck);
    }).catch(() => setHasAccount(false));
  }, [address]);

  const handleToggle = async () => {
    if (!address || toggling) return;
    setToggling(true);
    const newValue = !aiRiskCheck;
    try {
      await api.updateAccountSettings(address, { aiRiskCheck: newValue });
      setAiRiskCheck(newValue);
    } catch (err) {
      console.error('Failed to toggle AI risk check:', err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-monad-500">
            Synthetic Order Flow
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
              Dashboard
            </Link>
            <Link href="/create" className="text-sm text-gray-400 hover:text-white transition">
              New Order
            </Link>
            <Link href="/orders" className="text-sm text-gray-400 hover:text-white transition">
              My Orders
            </Link>
            <Link href="/orderbook" className="text-sm text-gray-400 hover:text-white transition">
              Orderbook
            </Link>
            <Link href="/chat" className="text-sm text-monad-400 hover:text-monad-300 font-medium transition">
              AI Chat
            </Link>
            <Link href="/guide" className="text-sm text-gray-400 hover:text-white transition">
              Guide
            </Link>
            <Link href="/settings" className="text-sm text-gray-400 hover:text-white transition">
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {hasAccount && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className="hidden md:flex items-center gap-2 text-xs"
              title={aiRiskCheck ? 'AI Risk Check is ON: orders may be blocked by AI' : 'AI Risk Check is OFF: orders execute without AI review'}
            >
              <span className={aiRiskCheck ? 'text-yellow-400' : 'text-gray-500'}>
                AI Guard
              </span>
              <div className={`relative w-8 h-4 rounded-full transition-colors ${
                aiRiskCheck ? 'bg-yellow-600' : 'bg-gray-700'
              }`}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                  aiRiskCheck ? 'translate-x-4' : ''
                }`} />
              </div>
            </button>
          )}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
