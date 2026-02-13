'use client';

import { useAccount } from 'wagmi';
import { useOrders } from '@/hooks/useOrders';
import { OrderList } from '@/components/order/OrderList';

export default function OrdersPage() {
  const { isConnected } = useAccount();
  const { orders, loading, refetch } = useOrders();

  if (!isConnected) {
    return (
      <div className="text-center text-gray-500 py-20">
        Connect your wallet to view orders
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : (
        <OrderList orders={orders} onRefresh={refetch} />
      )}
    </div>
  );
}
