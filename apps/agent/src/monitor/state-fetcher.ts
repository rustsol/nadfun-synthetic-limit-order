import { parseEther } from 'viem';
import { CONTRACTS, lensAbi, tokenAbi } from '@nadfun/shared';
import { publicClient } from '../chain/client.js';

const NADFUN_API = 'https://api.nad.fun';

export interface NadFunMarketInfo {
  token_id: string;
  market_type: string;      // "CURVE" | "DEX"
  market_id: string;
  reserve_native: string;
  reserve_token: string;
  price: string;             // price in MON (human readable)
  price_usd: string;         // price in USD
  price_native: string;      // same as price
  total_supply: string;      // wei
  volume: string;            // wei
  ath_price: string;
  ath_price_usd: string;
  ath_price_native: string;
  holder_count: number;
  native_price: string;      // MON/USD rate
}

export interface TokenChainState {
  tokenAddress: string;
  name: string;
  symbol: string;
  isGraduated: boolean;
  isLocked: boolean;
  progress: bigint;
  totalSupply: bigint;
  buyRouter: string;
  buyAmountOut: bigint;
  sellRouter: string;
  sellAmountOut: bigint;
  // nad.fun API market data
  nadMarket?: NadFunMarketInfo;
}

// In-memory cache for nad.fun market data (refreshed per fetch cycle)
let nadMarketCache = new Map<string, NadFunMarketInfo>();
let nadCacheTimestamp = 0;
const NAD_CACHE_TTL = 10_000; // 10 seconds

/** Fetch market data from nad.fun API, searching through pages */
export async function fetchNadFunMarket(tokenAddress: string): Promise<NadFunMarketInfo | undefined> {
  const addrLower = tokenAddress.toLowerCase();

  // Return from cache if fresh
  if (Date.now() - nadCacheTimestamp < NAD_CACHE_TTL && nadMarketCache.has(addrLower)) {
    return nadMarketCache.get(addrLower);
  }

  try {
    // Fetch first 5 pages (100 tokens) — covers most actively traded tokens
    const maxPages = 5;
    const newCache = new Map<string, NadFunMarketInfo>();

    for (let page = 1; page <= maxPages; page++) {
      const res = await fetch(`${NADFUN_API}/order/market_cap?page=${page}`);
      if (!res.ok) break;
      const data = await res.json() as { tokens?: Array<{ market_info?: NadFunMarketInfo }> };
      if (!data.tokens?.length) break;

      for (const entry of data.tokens) {
        if (entry.market_info?.token_id) {
          newCache.set(entry.market_info.token_id.toLowerCase(), entry.market_info);
        }
      }

      // Found the token — no need to fetch more pages
      if (newCache.has(addrLower)) break;
    }

    nadMarketCache = newCache;
    nadCacheTimestamp = Date.now();
    return nadMarketCache.get(addrLower);
  } catch {
    return undefined;
  }
}

export async function fetchTokenState(tokenAddress: string): Promise<TokenChainState> {
  const addr = tokenAddress as `0x${string}`;
  const lensAddr = CONTRACTS.LENS as `0x${string}`;
  const oneToken = parseEther('1');

  // Fetch on-chain state and nad.fun API market data in parallel
  const [results, nadMarket] = await Promise.all([
    publicClient.multicall({
      contracts: [
        { address: addr, abi: tokenAbi, functionName: 'name' },
        { address: addr, abi: tokenAbi, functionName: 'symbol' },
        { address: lensAddr, abi: lensAbi, functionName: 'isGraduated', args: [addr] },
        { address: lensAddr, abi: lensAbi, functionName: 'isLocked', args: [addr] },
        { address: lensAddr, abi: lensAbi, functionName: 'getProgress', args: [addr] },
        { address: lensAddr, abi: lensAbi, functionName: 'getAmountOut', args: [addr, oneToken, true] },
        { address: lensAddr, abi: lensAbi, functionName: 'getAmountOut', args: [addr, oneToken, false] },
        { address: addr, abi: tokenAbi, functionName: 'totalSupply' },
      ],
    }),
    fetchNadFunMarket(tokenAddress),
  ]);

  const name = results[0].status === 'success' ? (results[0].result as string) : 'Unknown';
  const symbol = results[1].status === 'success' ? (results[1].result as string) : '???';
  const isGraduated = results[2].status === 'success' ? (results[2].result as boolean) : false;
  const isLocked = results[3].status === 'success' ? (results[3].result as boolean) : false;
  const progress = results[4].status === 'success' ? (results[4].result as bigint) : 0n;

  let buyRouter: string = CONTRACTS.BONDING_CURVE_ROUTER;
  let buyAmountOut = 0n;
  if (results[5].status === 'success') {
    const [router, amountOut] = results[5].result as [string, bigint];
    buyRouter = router;
    buyAmountOut = amountOut;
  }

  let sellRouter: string = CONTRACTS.BONDING_CURVE_ROUTER;
  let sellAmountOut = 0n;
  if (results[6].status === 'success') {
    const [router, amountOut] = results[6].result as [string, bigint];
    sellRouter = router;
    sellAmountOut = amountOut;
  }

  const totalSupply = results[7].status === 'success' ? (results[7].result as bigint) : 0n;

  return {
    tokenAddress,
    name,
    symbol,
    isGraduated,
    isLocked,
    progress,
    totalSupply,
    buyRouter,
    buyAmountOut,
    sellRouter,
    sellAmountOut,
    nadMarket,
  };
}

export async function fetchBatchTokenStates(
  tokenAddresses: string[]
): Promise<Map<string, TokenChainState>> {
  const results = new Map<string, TokenChainState>();
  const unique = [...new Set(tokenAddresses.map(a => a.toLowerCase()))];

  const promises = unique.map(async (addr) => {
    try {
      const state = await fetchTokenState(addr);
      results.set(addr.toLowerCase(), state);
    } catch (err) {
      console.error(`Failed to fetch state for ${addr}:`, err);
    }
  });

  await Promise.all(promises);
  return results;
}
