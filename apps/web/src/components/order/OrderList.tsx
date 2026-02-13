'use client';

import { useState } from 'react';
import { OrderCard } from './OrderCard';

interface Props {
  orders: any[];
  onRefresh?: () => void;
}

const TABS = ['All', 'Active', 'Triggered', 'Executed', 'Expired'] as const;

export function OrderList({ orders, onRefresh }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]>('All');

  const filtered = orders.filter(o => {
    if (tab === 'All') return true;
    return o.status === tab.toUpperCase();
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === t
                ? 'bg-monad-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t}
            {t !== 'All' && (
              <span className="ml-1 text-xs opacity-60">
                ({orders.filter(o => o.status === t.toUpperCase()).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No {tab.toLowerCase()} orders
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
