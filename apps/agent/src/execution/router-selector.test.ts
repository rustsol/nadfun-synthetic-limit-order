import { describe, it, expect } from 'vitest';
import { selectRouter } from './router-selector';
import { CONTRACTS } from '@nadfun/shared';

describe('selectRouter', () => {
  it('identifies DEX router', () => {
    const result = selectRouter(CONTRACTS.DEX_ROUTER);
    expect(result.type).toBe('dex');
    expect(result.address).toBe(CONTRACTS.DEX_ROUTER);
  });

  it('identifies bonding curve router', () => {
    const result = selectRouter(CONTRACTS.BONDING_CURVE_ROUTER);
    expect(result.type).toBe('bonding_curve');
    expect(result.address).toBe(CONTRACTS.BONDING_CURVE_ROUTER);
  });

  it('treats unknown address as bonding curve', () => {
    const result = selectRouter('0x1234567890123456789012345678901234567890');
    expect(result.type).toBe('bonding_curve');
  });

  it('is case-insensitive', () => {
    const result = selectRouter(CONTRACTS.DEX_ROUTER.toLowerCase());
    expect(result.type).toBe('dex');
  });

  it('handles mixed-case addresses', () => {
    const result = selectRouter(CONTRACTS.DEX_ROUTER.toUpperCase());
    expect(result.type).toBe('dex');
  });
});
