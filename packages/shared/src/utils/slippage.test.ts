import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { applySlippage, checkSlippageAcceptable } from './slippage';

describe('applySlippage', () => {
  it('applies 0% slippage (0 bps)', () => {
    const result = applySlippage(parseEther('100'), 0);
    expect(result).toBe(parseEther('100'));
  });

  it('applies 1% slippage (100 bps)', () => {
    const result = applySlippage(parseEther('100'), 100);
    expect(result).toBe(parseEther('99'));
  });

  it('applies 3% slippage (300 bps) — default', () => {
    const result = applySlippage(parseEther('1000'), 300);
    expect(result).toBe(parseEther('970'));
  });

  it('applies 5% slippage (500 bps)', () => {
    const result = applySlippage(parseEther('200'), 500);
    expect(result).toBe(parseEther('190'));
  });

  it('applies 10% slippage (1000 bps)', () => {
    const result = applySlippage(parseEther('100'), 1000);
    expect(result).toBe(parseEther('90'));
  });

  it('applies 50% slippage (5000 bps)', () => {
    const result = applySlippage(parseEther('100'), 5000);
    expect(result).toBe(parseEther('50'));
  });

  it('returns 0 for 100% slippage (10000 bps)', () => {
    const result = applySlippage(parseEther('100'), 10000);
    expect(result).toBe(0n);
  });

  it('returns 0 when amountOut is 0', () => {
    const result = applySlippage(0n, 300);
    expect(result).toBe(0n);
  });

  it('handles small amounts without losing precision', () => {
    // 1000 wei with 3% slippage = 970 wei
    const result = applySlippage(1000n, 300);
    expect(result).toBe(970n);
  });
});

describe('checkSlippageAcceptable', () => {
  it('accepts when fresh quote equals expected', () => {
    const result = checkSlippageAcceptable(parseEther('100'), parseEther('100'), 300);
    expect(result.acceptable).toBe(true);
    expect(result.actualSlippageBps).toBe(0);
  });

  it('accepts when fresh quote is higher than expected (positive slippage)', () => {
    const result = checkSlippageAcceptable(parseEther('100'), parseEther('105'), 300);
    expect(result.acceptable).toBe(true);
    expect(result.actualSlippageBps).toBe(0);
  });

  it('accepts slippage within tolerance (2% actual, 3% max)', () => {
    const result = checkSlippageAcceptable(parseEther('100'), parseEther('98'), 300);
    expect(result.acceptable).toBe(true);
    expect(result.actualSlippageBps).toBe(200);
  });

  it('accepts slippage at exact tolerance (3% actual, 3% max)', () => {
    const result = checkSlippageAcceptable(parseEther('100'), parseEther('97'), 300);
    expect(result.acceptable).toBe(true);
    expect(result.actualSlippageBps).toBe(300);
  });

  it('rejects slippage above tolerance (5% actual, 3% max)', () => {
    const result = checkSlippageAcceptable(parseEther('100'), parseEther('95'), 300);
    expect(result.acceptable).toBe(false);
    expect(result.actualSlippageBps).toBe(500);
  });

  it('rejects when expected is 0', () => {
    const result = checkSlippageAcceptable(0n, parseEther('100'), 300);
    expect(result.acceptable).toBe(false);
    expect(result.actualSlippageBps).toBe(10000);
  });

  it('accepts tiny slippage (0.01% actual, 3% max)', () => {
    const result = checkSlippageAcceptable(parseEther('10000'), parseEther('9999'), 300);
    expect(result.acceptable).toBe(true);
    expect(result.actualSlippageBps).toBe(1);
  });

  it('handles whale amounts correctly', () => {
    const result = checkSlippageAcceptable(
      parseEther('1000000'),
      parseEther('970000'),
      300
    );
    expect(result.acceptable).toBe(true);
    expect(result.actualSlippageBps).toBe(300);
  });
});
