'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface NadFunMarketInfo {
  market_type: string;
  market_id: string;
  reserve_native: string;
  reserve_token: string;
  price: string;
  price_usd: string;
  price_native: string;
  total_supply: string;
  volume: string;
  ath_price: string;
  ath_price_usd: string;
  ath_price_native: string;
  holder_count: number;
  native_price: string;
}

export interface TokenStateData {
  tokenAddress: string;
  name: string;
  symbol: string;
  isGraduated: boolean;
  isLocked: boolean;
  progress: string;
  totalSupply: string;
  buyRouter: string;
  buyAmountOut: string;
  sellRouter: string;
  sellAmountOut: string;
  nadMarket: NadFunMarketInfo | null;
}

export function useTokenState(tokenAddress: string | undefined) {
  const [data, setData] = useState<TokenStateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress || tokenAddress.length !== 42) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getTokenState(tokenAddress)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tokenAddress]);

  return { data, loading, error };
}
