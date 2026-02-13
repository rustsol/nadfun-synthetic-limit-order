'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useOrders } from '@/hooks/useOrders';
import { useAgentEvents } from '@/hooks/useAgentEvents';
import { OrderList } from '@/components/order/OrderList';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { orders, loading, refetch } = useOrders();
  const { events, connected } = useAgentEvents(address);
  const [agentAccount, setAgentAccount] = useState<any>(null);
  const [agentBalance, setAgentBalance] = useState<any>(null);

  useEffect(() => {
    if (!address) return;
    api.getAccount(address).then(account => {
      setAgentAccount(account);
      api.getAgentBalance(address).then(bal => setAgentBalance(bal)).catch(() => {});
    }).catch(() => {});
  }, [address]);

  if (!isConnected) {
    return (
      <div className="text-center py-20 space-y-6">
        <h1 className="text-4xl font-bold text-white">Synthetic Order Flow</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Connect your wallet to access the trading dashboard.
        </p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status === 'ACTIVE').length;
  const triggeredOrders = orders.filter(o => o.status === 'TRIGGERED').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Agent {connected ? (
              <span className="text-green-400">connected</span>
            ) : (
              <span className="text-yellow-400">connecting...</span>
            )}
          </p>
        </div>
        <Link href="/create" className="px-6 py-2.5 bg-monad-600 hover:bg-monad-700 text-white rounded-lg font-medium transition">
          + New Order
        </Link>
      </div>

      {agentAccount ? (
        <div className="bg-gray-900 border border-monad-800/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-monad-400">AI Agent Wallet</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">Auto-Execute Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">{agentAccount.agentAddress}</span>
            <span className="text-sm font-mono text-white">{agentBalance?.monBalanceFormatted?.slice(0, 10) || '0'} MON</span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Set up your AI Agent to auto-execute orders</p>
            <p className="text-xs text-gray-500">Agent gets its own wallet for trading</p>
          </div>
          <Link href="/settings" className="px-4 py-2 bg-monad-600 hover:bg-monad-700 text-white text-sm rounded-lg transition">Setup Agent</Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Active</p>
          <p className="text-2xl font-bold text-blue-400">{activeOrders}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Triggered</p>
          <p className="text-2xl font-bold text-yellow-400">{triggeredOrders}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Executed</p>
          <p className="text-2xl font-bold text-green-400">{orders.filter(o => o.status === 'EXECUTED').length}</p>
        </div>
      </div>

      {events.length > 0 && (
        <div className="bg-gray-900 border border-yellow-800/50 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-medium text-yellow-400">Recent Events</h3>
          {events.slice(0, 5).map((event, i) => (
            <div key={i} className="text-xs text-gray-300">
              [{event.type}] {event.orderId ? `Order ${event.orderId.slice(0, 8)}...` : ''} {event.reason || ''}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading orders...</div>
      ) : (
        <OrderList orders={orders} onRefresh={refetch} />
      )}
    </div>
  );
}
