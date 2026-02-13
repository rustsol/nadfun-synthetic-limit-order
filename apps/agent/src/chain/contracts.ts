import { getContract } from 'viem';
import {
  CONTRACTS,
  lensAbi,
  bondingCurveRouterAbi,
  dexRouterAbi,
  bondingCurveAbi,
  tokenAbi,
} from '@nadfun/shared';
import { publicClient } from './client.js';

export const lensContract = getContract({
  address: CONTRACTS.LENS as `0x${string}`,
  abi: lensAbi,
  client: publicClient,
});

export const bondingCurveRouterContract = getContract({
  address: CONTRACTS.BONDING_CURVE_ROUTER as `0x${string}`,
  abi: bondingCurveRouterAbi,
  client: publicClient,
});

export const dexRouterContract = getContract({
  address: CONTRACTS.DEX_ROUTER as `0x${string}`,
  abi: dexRouterAbi,
  client: publicClient,
});

export const bondingCurveContract = getContract({
  address: CONTRACTS.BONDING_CURVE as `0x${string}`,
  abi: bondingCurveAbi,
  client: publicClient,
});

export function getTokenContract(tokenAddress: string) {
  return getContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    client: publicClient,
  });
}
