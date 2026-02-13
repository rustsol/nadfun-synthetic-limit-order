import { encodeFunctionData } from 'viem';
import {
  CONTRACTS,
  bondingCurveRouterAbi,
  dexRouterAbi,
  type UnsignedTxPayload,
} from '@nadfun/shared';
import { monad } from '@nadfun/shared';

const TX_DEADLINE_SECONDS = parseInt(process.env.TX_DEADLINE_SECONDS || '300');

function getDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + TX_DEADLINE_SECONDS);
}

export function buildBondingCurveBuyTx(params: {
  inputMonAmount: bigint;
  minTokensOut: bigint;
  tokenAddress: string;
  userAddress: string;
}): UnsignedTxPayload {
  const data = encodeFunctionData({
    abi: bondingCurveRouterAbi,
    functionName: 'buy',
    args: [{
      amountOutMin: params.minTokensOut,
      token: params.tokenAddress as `0x${string}`,
      to: params.userAddress as `0x${string}`,
      deadline: getDeadline(),
    }],
  });

  return {
    to: CONTRACTS.BONDING_CURVE_ROUTER,
    data,
    value: params.inputMonAmount.toString(),
    chainId: monad.id,
  };
}

export function buildBondingCurveSellTx(params: {
  tokenAmountIn: bigint;
  minMonOut: bigint;
  tokenAddress: string;
  userAddress: string;
}): UnsignedTxPayload {
  const data = encodeFunctionData({
    abi: bondingCurveRouterAbi,
    functionName: 'sell',
    args: [{
      amountIn: params.tokenAmountIn,
      amountOutMin: params.minMonOut,
      token: params.tokenAddress as `0x${string}`,
      to: params.userAddress as `0x${string}`,
      deadline: getDeadline(),
    }],
  });

  return {
    to: CONTRACTS.BONDING_CURVE_ROUTER,
    data,
    value: '0',
    chainId: monad.id,
  };
}

export function buildDexBuyTx(params: {
  inputMonAmount: bigint;
  minTokensOut: bigint;
  tokenAddress: string;
  userAddress: string;
}): UnsignedTxPayload {
  const data = encodeFunctionData({
    abi: dexRouterAbi,
    functionName: 'buy',
    args: [{
      amountOutMin: params.minTokensOut,
      token: params.tokenAddress as `0x${string}`,
      to: params.userAddress as `0x${string}`,
      deadline: getDeadline(),
    }],
  });

  return {
    to: CONTRACTS.DEX_ROUTER,
    data,
    value: params.inputMonAmount.toString(),
    chainId: monad.id,
  };
}

export function buildDexSellTx(params: {
  tokenAmountIn: bigint;
  minMonOut: bigint;
  tokenAddress: string;
  userAddress: string;
}): UnsignedTxPayload {
  const data = encodeFunctionData({
    abi: dexRouterAbi,
    functionName: 'sell',
    args: [{
      amountIn: params.tokenAmountIn,
      amountOutMin: params.minMonOut,
      token: params.tokenAddress as `0x${string}`,
      to: params.userAddress as `0x${string}`,
      deadline: getDeadline(),
    }],
  });

  return {
    to: CONTRACTS.DEX_ROUTER,
    data,
    value: '0',
    chainId: monad.id,
  };
}

export function buildUnsignedTx(params: {
  direction: 'BUY' | 'SELL';
  routerType: 'bonding_curve' | 'dex';
  inputAmount: bigint;
  amountOutMin: bigint;
  tokenAddress: string;
  userAddress: string;
}): UnsignedTxPayload {
  if (params.direction === 'BUY') {
    if (params.routerType === 'bonding_curve') {
      return buildBondingCurveBuyTx({
        inputMonAmount: params.inputAmount,
        minTokensOut: params.amountOutMin,
        tokenAddress: params.tokenAddress,
        userAddress: params.userAddress,
      });
    }
    return buildDexBuyTx({
      inputMonAmount: params.inputAmount,
      minTokensOut: params.amountOutMin,
      tokenAddress: params.tokenAddress,
      userAddress: params.userAddress,
    });
  }

  if (params.routerType === 'bonding_curve') {
    return buildBondingCurveSellTx({
      tokenAmountIn: params.inputAmount,
      minMonOut: params.amountOutMin,
      tokenAddress: params.tokenAddress,
      userAddress: params.userAddress,
    });
  }
  return buildDexSellTx({
    tokenAmountIn: params.inputAmount,
    minMonOut: params.amountOutMin,
    tokenAddress: params.tokenAddress,
    userAddress: params.userAddress,
  });
}
