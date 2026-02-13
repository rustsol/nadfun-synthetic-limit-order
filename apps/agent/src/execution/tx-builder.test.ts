import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEther, decodeFunctionData } from 'viem';
import {
  buildBondingCurveBuyTx,
  buildBondingCurveSellTx,
  buildDexBuyTx,
  buildDexSellTx,
  buildUnsignedTx,
} from './tx-builder';

// Import ABIs for decoding
import { bondingCurveRouterAbi, dexRouterAbi, CONTRACTS } from '@nadfun/shared';

const TEST_TOKEN = '0x0dfbc608339aea55f5eeede640335dac062a7777';
const TEST_USER = '0xd1ef3e71d4a18d0e81b3f4b7c538e3a1026e38e7';

describe('buildBondingCurveBuyTx', () => {
  it('builds a valid buy tx with correct router address', () => {
    const tx = buildBondingCurveBuyTx({
      inputMonAmount: parseEther('0.1'),
      minTokensOut: parseEther('100'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    expect(tx.to).toBe(CONTRACTS.BONDING_CURVE_ROUTER);
    expect(tx.value).toBe(parseEther('0.1').toString());
    expect(tx.data).toMatch(/^0x/);
    expect(tx.chainId).toBe(143);
  });

  it('encodes buy function data with correct parameters', () => {
    const tx = buildBondingCurveBuyTx({
      inputMonAmount: parseEther('1'),
      minTokensOut: parseEther('500'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    const decoded = decodeFunctionData({
      abi: bondingCurveRouterAbi,
      data: tx.data as `0x${string}`,
    });

    expect(decoded.functionName).toBe('buy');
    const params = (decoded.args as any)[0];
    expect(params.amountOutMin).toBe(parseEther('500'));
    expect(params.token.toLowerCase()).toBe(TEST_TOKEN.toLowerCase());
    expect(params.to.toLowerCase()).toBe(TEST_USER.toLowerCase());
    expect(params.deadline).toBeGreaterThan(0n);
  });
});

describe('buildBondingCurveSellTx', () => {
  it('builds a valid sell tx with value = 0', () => {
    const tx = buildBondingCurveSellTx({
      tokenAmountIn: parseEther('1000'),
      minMonOut: parseEther('0.5'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    expect(tx.to).toBe(CONTRACTS.BONDING_CURVE_ROUTER);
    expect(tx.value).toBe('0');
    expect(tx.chainId).toBe(143);
  });

  it('encodes sell function data with correct parameters', () => {
    const tx = buildBondingCurveSellTx({
      tokenAmountIn: parseEther('1000'),
      minMonOut: parseEther('0.5'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    const decoded = decodeFunctionData({
      abi: bondingCurveRouterAbi,
      data: tx.data as `0x${string}`,
    });

    expect(decoded.functionName).toBe('sell');
    const params = (decoded.args as any)[0];
    expect(params.amountIn).toBe(parseEther('1000'));
    expect(params.amountOutMin).toBe(parseEther('0.5'));
  });
});

describe('buildDexBuyTx', () => {
  it('builds a valid DEX buy tx', () => {
    const tx = buildDexBuyTx({
      inputMonAmount: parseEther('0.5'),
      minTokensOut: parseEther('200'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    expect(tx.to).toBe(CONTRACTS.DEX_ROUTER);
    expect(tx.value).toBe(parseEther('0.5').toString());
    expect(tx.chainId).toBe(143);
  });
});

describe('buildDexSellTx', () => {
  it('builds a valid DEX sell tx with value = 0', () => {
    const tx = buildDexSellTx({
      tokenAmountIn: parseEther('500'),
      minMonOut: parseEther('0.3'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    expect(tx.to).toBe(CONTRACTS.DEX_ROUTER);
    expect(tx.value).toBe('0');
  });
});

describe('buildUnsignedTx — routing', () => {
  it('routes BUY + bonding_curve to buildBondingCurveBuyTx', () => {
    const tx = buildUnsignedTx({
      direction: 'BUY',
      routerType: 'bonding_curve',
      inputAmount: parseEther('0.1'),
      amountOutMin: parseEther('100'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });
    expect(tx.to).toBe(CONTRACTS.BONDING_CURVE_ROUTER);
    expect(BigInt(tx.value)).toBe(parseEther('0.1'));
  });

  it('routes BUY + dex to buildDexBuyTx', () => {
    const tx = buildUnsignedTx({
      direction: 'BUY',
      routerType: 'dex',
      inputAmount: parseEther('0.5'),
      amountOutMin: parseEther('200'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });
    expect(tx.to).toBe(CONTRACTS.DEX_ROUTER);
  });

  it('routes SELL + bonding_curve to buildBondingCurveSellTx', () => {
    const tx = buildUnsignedTx({
      direction: 'SELL',
      routerType: 'bonding_curve',
      inputAmount: parseEther('1000'),
      amountOutMin: parseEther('0.5'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });
    expect(tx.to).toBe(CONTRACTS.BONDING_CURVE_ROUTER);
    expect(tx.value).toBe('0');
  });

  it('routes SELL + dex to buildDexSellTx', () => {
    const tx = buildUnsignedTx({
      direction: 'SELL',
      routerType: 'dex',
      inputAmount: parseEther('1000'),
      amountOutMin: parseEther('0.3'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });
    expect(tx.to).toBe(CONTRACTS.DEX_ROUTER);
    expect(tx.value).toBe('0');
  });
});

describe('buildUnsignedTx — deadline', () => {
  it('sets a deadline in the future', () => {
    const tx = buildBondingCurveBuyTx({
      inputMonAmount: parseEther('0.1'),
      minTokensOut: parseEther('100'),
      tokenAddress: TEST_TOKEN,
      userAddress: TEST_USER,
    });

    const decoded = decodeFunctionData({
      abi: bondingCurveRouterAbi,
      data: tx.data as `0x${string}`,
    });

    const params = (decoded.args as any)[0];
    const deadline = Number(params.deadline);
    const now = Math.floor(Date.now() / 1000);
    // Deadline should be at least 60 seconds in the future
    expect(deadline).toBeGreaterThan(now + 60);
    // But not more than 600 seconds (default 300 + buffer)
    expect(deadline).toBeLessThan(now + 600);
  });
});
