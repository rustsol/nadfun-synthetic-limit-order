import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { calculatePricePerToken, formatMon, formatTokenAmount, formatProgress } from './price';

describe('calculatePricePerToken', () => {
  it('returns correct price for 1:1 ratio', () => {
    const price = calculatePricePerToken(parseEther('1'), parseEther('1'));
    expect(price).toBe(parseEther('1'));
  });

  it('returns correct price when 1 MON buys 1000 tokens', () => {
    const price = calculatePricePerToken(parseEther('1'), parseEther('1000'));
    expect(price).toBe(parseEther('0.001'));
  });

  it('returns correct price when 0.1 MON buys 500 tokens', () => {
    const price = calculatePricePerToken(parseEther('0.1'), parseEther('500'));
    expect(price).toBe(parseEther('0.0002'));
  });

  it('returns 0 when amountOut is 0 (division by zero protection)', () => {
    const price = calculatePricePerToken(parseEther('1'), 0n);
    expect(price).toBe(0n);
  });

  it('handles very large token amounts (whale buys)', () => {
    const price = calculatePricePerToken(parseEther('100'), parseEther('1000000'));
    expect(price).toBe(parseEther('0.0001'));
  });

  it('handles very small amounts (dust)', () => {
    const price = calculatePricePerToken(1000n, 1000000n);
    expect(price).toBe(1000000000000000n); // 0.001 ether in wei
  });
});

describe('formatMon', () => {
  it('formats 1 MON correctly', () => {
    expect(formatMon(parseEther('1'))).toBe('1');
  });

  it('formats 0.1 MON correctly', () => {
    expect(formatMon(parseEther('0.1'))).toBe('0.1');
  });

  it('accepts string input', () => {
    expect(formatMon('1000000000000000000')).toBe('1');
  });

  it('formats 0 correctly', () => {
    expect(formatMon(0n)).toBe('0');
  });
});

describe('formatTokenAmount', () => {
  it('formats whole token amounts', () => {
    expect(formatTokenAmount(parseEther('1000'))).toBe('1000.0000');
  });

  it('formats fractional amounts with 4 decimal places', () => {
    const result = formatTokenAmount(parseEther('1.5'));
    expect(result).toBe('1.5000');
  });

  it('truncates to 4 decimal places', () => {
    const result = formatTokenAmount(parseEther('1.123456789'));
    expect(result).toBe('1.1234');
  });

  it('accepts string input', () => {
    expect(formatTokenAmount('1000000000000000000')).toBe('1.0000');
  });
});

describe('formatProgress', () => {
  it('formats 0% progress', () => {
    expect(formatProgress(0n)).toBe('0.00%');
  });

  it('formats 50% progress (5000 bps)', () => {
    expect(formatProgress(5000n)).toBe('50.00%');
  });

  it('formats 100% progress (10000 bps)', () => {
    expect(formatProgress(10000n)).toBe('100.00%');
  });

  it('formats 3.52% progress (352 bps)', () => {
    expect(formatProgress(352n)).toBe('3.52%');
  });

  it('accepts string input', () => {
    expect(formatProgress('7500')).toBe('75.00%');
  });
});
