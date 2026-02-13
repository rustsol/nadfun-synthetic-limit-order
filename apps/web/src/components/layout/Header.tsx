'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-monad-500">
            Synthetic Order Flow
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
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
        <ConnectButton />
      </div>
    </header>
  );
}
