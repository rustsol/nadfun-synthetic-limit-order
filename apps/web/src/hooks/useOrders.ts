'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';

export function useOrders() {
  const { address } = useAccount();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchOrders = useCallback(async () => {
    if (!address) return;
    // Only show loading spinner on initial fetch, not on polls
    if (!hasFetched.current) setLoading(true);
    try {
      const data = await api.getOrders(address);
      setOrders(data);
      hasFetched.current = true;
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    hasFetched.current = false;
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}
