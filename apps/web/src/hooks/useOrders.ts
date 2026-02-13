'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';

export function useOrders() {
  const { address } = useAccount();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await api.getOrders(address);
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}
