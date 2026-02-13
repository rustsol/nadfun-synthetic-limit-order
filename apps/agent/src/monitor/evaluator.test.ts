import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { evaluateOrder } from './evaluator';
import type { TokenChainState } from './state-fetcher';

// Helper to create a mock order
function mockOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'test-order-1',
    walletAddress: '0xee2a36a186203858dd734387a29b42478e3fad48',
    tokenAddress: '0x0dfbc608339aea55f5eeede640335dac062a7777',
    direction: 'BUY' as const,
    inputAmount: parseEther('0.1').toString(),
    triggerType: 'PRICE_BELOW' as const,
    triggerValue: parseEther('0.001').toString(),
    maxSlippageBps: 300,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    status: 'ACTIVE' as const,
    routerUsed: null,
    txHash: null,
    referencePrice: null,
    peakPrice: null,
    lastExecutedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create a mock token state
function mockState(overrides: Partial<TokenChainState> = {}): TokenChainState {
  return {
    tokenAddress: '0x0dfbc608339aea55f5eeede640335dac062a7777',
    name: 'DISCLOSURE',
    symbol: 'DISCLOSURE',
    isGraduated: false,
    isLocked: false,
    progress: 352n,
    totalSupply: parseEther('1000000'), // 1M tokens
    buyRouter: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
    buyAmountOut: parseEther('1000'), // 1 MON buys 1000 tokens
    sellRouter: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
    sellAmountOut: parseEther('0.0008'), // 1 token sells for 0.0008 MON
    ...overrides,
  };
}

describe('evaluateOrder — expiration', () => {
  it('does not trigger expired orders', () => {
    const order = mockOrder({ expiresAt: new Date(Date.now() - 1000) });
    const result = evaluateOrder(order, mockState());
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('processes non-expired orders', () => {
    const order = mockOrder({
      expiresAt: new Date(Date.now() + 3600000),
      triggerType: 'PRICE_BELOW',
      triggerValue: parseEther('10').toString(), // very high target = will trigger
    });
    const result = evaluateOrder(order, mockState());
    expect(result.triggered).toBe(true);
  });
});

describe('evaluateOrder — invalid token state safety', () => {
  it('skips evaluation when state is all zeros (RPC failure)', () => {
    const state = mockState({
      name: 'Unknown',
      progress: 0n,
      buyAmountOut: 0n,
    });
    const result = evaluateOrder(mockOrder(), state);
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('unavailable');
  });

  it('still evaluates when only some fields are zero', () => {
    const state = mockState({
      name: 'TestToken',
      progress: 0n,
      buyAmountOut: 0n,
    });
    const order = mockOrder({
      triggerType: 'PROGRESS_BELOW',
      triggerValue: '100',
    });
    const result = evaluateOrder(order, state);
    // Should still evaluate (name is not "Unknown")
    expect(result.triggered).toBe(true);
  });
});

describe('evaluateOrder — BUY safety checks', () => {
  it('aborts BUY when token is locked', () => {
    const state = mockState({ isLocked: true });
    const order = mockOrder({ direction: 'BUY' });
    const result = evaluateOrder(order, state);
    expect(result.abort).toBe(true);
    expect(result.abortReason).toContain('locked');
  });

  it('aborts BUY when token has graduated (non-post-graduation order)', () => {
    const state = mockState({ isGraduated: true });
    const order = mockOrder({ direction: 'BUY', triggerType: 'PRICE_BELOW' });
    const result = evaluateOrder(order, state);
    expect(result.abort).toBe(true);
    expect(result.abortReason).toContain('graduated');
  });

  it('does NOT abort POST_GRADUATION order when token graduated', () => {
    const state = mockState({ isGraduated: true });
    const order = mockOrder({ direction: 'BUY', triggerType: 'POST_GRADUATION' });
    // POST_GRADUATION + BUY + graduated => triggers
    const result = evaluateOrder(order, state);
    expect(result.abort).toBe(false);
  });

  it('does NOT abort SELL when token is locked', () => {
    const state = mockState({ isLocked: true });
    const order = mockOrder({ direction: 'SELL', triggerType: 'PRICE_ABOVE', triggerValue: '0' });
    const result = evaluateOrder(order, state);
    expect(result.abort).toBe(false);
  });
});

describe('evaluateOrder — PRICE_BELOW trigger', () => {
  it('triggers when price is below target', () => {
    // buyAmountOut = 1000 tokens per 1 MON => price = 0.001 MON/token
    const state = mockState({ buyAmountOut: parseEther('1000') });
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PRICE_BELOW',
      triggerValue: parseEther('0.002').toString(), // target: 0.002 MON
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('condition met');
  });

  it('does NOT trigger when price is above target', () => {
    const state = mockState({ buyAmountOut: parseEther('1000') }); // price = 0.001
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PRICE_BELOW',
      triggerValue: parseEther('0.0005').toString(), // target: 0.0005
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('waiting');
  });

  it('triggers when price equals target exactly', () => {
    const state = mockState({ buyAmountOut: parseEther('1000') }); // price = 0.001
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PRICE_BELOW',
      triggerValue: parseEther('0.001').toString(), // exact match
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
  });
});

describe('evaluateOrder — PRICE_ABOVE trigger', () => {
  it('triggers when price is above target', () => {
    // sellAmountOut = 0.002 MON per 1 token => price = 0.002
    const state = mockState({ sellAmountOut: parseEther('0.002') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'PRICE_ABOVE',
      triggerValue: parseEther('0.001').toString(), // target: 0.001
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('sell condition met');
  });

  it('does NOT trigger when price is below target', () => {
    const state = mockState({ sellAmountOut: parseEther('0.0005') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'PRICE_ABOVE',
      triggerValue: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });
});

describe('evaluateOrder — PROGRESS_BELOW trigger', () => {
  it('triggers when progress is below target', () => {
    const state = mockState({ progress: 100n }); // 1%
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PROGRESS_BELOW',
      triggerValue: '500', // 5%
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
  });

  it('does NOT trigger when progress is above target', () => {
    const state = mockState({ progress: 5000n }); // 50%
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PROGRESS_BELOW',
      triggerValue: '352', // 3.52%
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });

  it('triggers at exact progress match', () => {
    const state = mockState({ progress: 352n });
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PROGRESS_BELOW',
      triggerValue: '352',
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
  });
});

describe('evaluateOrder — PROGRESS_ABOVE trigger', () => {
  it('triggers when progress is above target', () => {
    const state = mockState({ progress: 5000n }); // 50%
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'PROGRESS_ABOVE',
      triggerValue: '2000', // 20%
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
  });

  it('does NOT trigger when progress is below target', () => {
    const state = mockState({ progress: 352n }); // 3.52%
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'PROGRESS_ABOVE',
      triggerValue: '5000', // 50%
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });
});

describe('evaluateOrder — POST_GRADUATION trigger', () => {
  it('triggers when token has graduated', () => {
    const state = mockState({ isGraduated: true });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'POST_GRADUATION',
      triggerValue: '0',
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('graduated');
  });

  it('does NOT trigger when token has not graduated', () => {
    const state = mockState({ isGraduated: false });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'POST_GRADUATION',
      triggerValue: '0',
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('waiting');
  });
});

describe('evaluateOrder — MCAP_BELOW trigger', () => {
  it('triggers when market cap is below target', () => {
    // price = 0.001 MON/token (1 MON / 1000 tokens), totalSupply = 1M tokens
    // marketCap = 0.001 * 1000000 = 1000 MON
    const state = mockState({ buyAmountOut: parseEther('1000'), totalSupply: parseEther('1000000') });
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'MCAP_BELOW',
      triggerValue: parseEther('2000').toString(), // target: 2000 MON mcap
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('condition met');
  });

  it('does NOT trigger when market cap is above target', () => {
    const state = mockState({ buyAmountOut: parseEther('1000'), totalSupply: parseEther('1000000') });
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'MCAP_BELOW',
      triggerValue: parseEther('500').toString(), // target: 500 MON mcap
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });
});

describe('evaluateOrder — MCAP_ABOVE trigger', () => {
  it('triggers when market cap is above target', () => {
    const state = mockState({ sellAmountOut: parseEther('0.001'), totalSupply: parseEther('1000000') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'MCAP_ABOVE',
      triggerValue: parseEther('500').toString(), // target: 500 MON mcap
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('sell condition met');
  });

  it('does NOT trigger when market cap is below target', () => {
    const state = mockState({ sellAmountOut: parseEther('0.001'), totalSupply: parseEther('1000000') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'MCAP_ABOVE',
      triggerValue: parseEther('2000').toString(), // target: 2000 MON mcap
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });
});

describe('evaluateOrder — TRAILING_STOP trigger', () => {
  it('triggers when price drops below trailing threshold', () => {
    // peakPrice = 0.001, drop = 20% (2000 bps)
    // threshold = 0.001 * (10000 - 2000) / 10000 = 0.0008
    // sellAmountOut = 0.0007 => price = 0.0007 <= 0.0008 => trigger
    const state = mockState({ sellAmountOut: parseEther('0.0007') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'TRAILING_STOP',
      triggerValue: '2000', // 20% drop
      peakPrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('sell triggered');
  });

  it('does NOT trigger when price is above threshold', () => {
    // peakPrice = 0.001, drop = 20% => threshold = 0.0008
    // sellAmountOut = 0.0009 => price = 0.0009 > 0.0008 => no trigger
    const state = mockState({ sellAmountOut: parseEther('0.0009') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'TRAILING_STOP',
      triggerValue: '2000',
      peakPrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });

  it('triggers at exact threshold', () => {
    const state = mockState({ sellAmountOut: parseEther('0.0008') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'TRAILING_STOP',
      triggerValue: '2000',
      peakPrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
  });
});

describe('evaluateOrder — TAKE_PROFIT trigger', () => {
  it('triggers when price rises above take-profit threshold', () => {
    // referencePrice = 0.001, gain = 50% (5000 bps)
    // threshold = 0.001 * (10000 + 5000) / 10000 = 0.0015
    // sellAmountOut = 0.002 => price = 0.002 >= 0.0015 => trigger
    const state = mockState({ sellAmountOut: parseEther('0.002') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'TAKE_PROFIT',
      triggerValue: '5000', // 50% gain
      referencePrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('sell triggered');
  });

  it('does NOT trigger when price is below threshold', () => {
    const state = mockState({ sellAmountOut: parseEther('0.0012') });
    const order = mockOrder({
      direction: 'SELL',
      triggerType: 'TAKE_PROFIT',
      triggerValue: '5000', // 50% gain
      referencePrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });
});

describe('evaluateOrder — DCA_INTERVAL trigger', () => {
  it('triggers when interval has elapsed', () => {
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'DCA_INTERVAL',
      triggerValue: '3600000', // 1 hour in ms
      lastExecutedAt: new Date(Date.now() - 7200000), // 2 hours ago
    });
    const result = evaluateOrder(order, mockState());
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('buy triggered');
  });

  it('does NOT trigger when interval has not elapsed', () => {
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'DCA_INTERVAL',
      triggerValue: '3600000', // 1 hour
      lastExecutedAt: new Date(Date.now() - 1800000), // 30 mins ago
    });
    const result = evaluateOrder(order, mockState());
    expect(result.triggered).toBe(false);
  });

  it('triggers immediately when lastExecutedAt is null (first run)', () => {
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'DCA_INTERVAL',
      triggerValue: '3600000',
      lastExecutedAt: null,
    });
    const result = evaluateOrder(order, mockState());
    expect(result.triggered).toBe(true);
  });
});

describe('evaluateOrder — PRICE_DROP_PCT trigger', () => {
  it('triggers when price drops by percentage from reference', () => {
    // referencePrice = 0.001, drop = 30% (3000 bps)
    // threshold = 0.001 * (10000 - 3000) / 10000 = 0.0007
    // buyAmountOut = 2000 tokens per MON => price = 0.0005 <= 0.0007 => trigger
    const state = mockState({ buyAmountOut: parseEther('2000') });
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PRICE_DROP_PCT',
      triggerValue: '3000', // 30% drop
      referencePrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('buy triggered');
  });

  it('does NOT trigger when price has not dropped enough', () => {
    // referencePrice = 0.001, drop = 30% => threshold = 0.0007
    // buyAmountOut = 1000 => price = 0.001 > 0.0007 => no trigger
    const state = mockState({ buyAmountOut: parseEther('1000') });
    const order = mockOrder({
      direction: 'BUY',
      triggerType: 'PRICE_DROP_PCT',
      triggerValue: '3000',
      referencePrice: parseEther('0.001').toString(),
    });
    const result = evaluateOrder(order, state);
    expect(result.triggered).toBe(false);
  });
});

describe('evaluateOrder — unknown trigger type', () => {
  it('does not trigger for unknown trigger types', () => {
    const order = mockOrder({ triggerType: 'UNKNOWN_TYPE' as any });
    const result = evaluateOrder(order, mockState());
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('Unknown trigger type');
  });
});
