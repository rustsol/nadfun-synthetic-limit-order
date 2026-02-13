/**
 * Paper Trading Test Script
 * Tests all trigger types for token 0x350035555E10d9AfAF1566AaebfCeD5BA6C27777 (CHOG)
 *
 * Usage:
 *   npx tsx scripts/paper-trade-test.ts
 *
 * Prerequisites:
 *   - Agent running on http://localhost:3001
 *   - Database accessible
 */

const API = 'http://localhost:3001';
const TOKEN = '0x350035555E10d9AfAF1566AaebfCeD5BA6C27777';
const WALLET = '0x0000000000000000000000000000000000000001'; // fake wallet for testing
const EXPIRES = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
// Rate limit: 5 POST /orders per 60s. We batch 4, wait, batch 4, etc.
const RATE_LIMIT_BATCH = 4;
const RATE_LIMIT_WAIT_MS = 62_000; // 62s to be safe

// ─── Helpers ────────────────────────────────────────────────────

interface OrderResponse {
  id: string;
  status: string;
  direction: string;
  triggerType: string;
  triggerValue: string;
  inputAmount: string;
  maxSlippageBps: number;
  referencePrice?: string | null;
  peakPrice?: string | null;
  tokenAddress: string;
  walletAddress: string;
  expiresAt: string;
  [key: string]: unknown;
}

interface TokenState {
  name: string;
  symbol: string;
  progress: string;
  totalSupply: string;
  buyAmountOut: string;
  sellAmountOut: string;
  isGraduated: boolean;
  isLocked: boolean;
  nadMarket: string | null;
}

const results: { test: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string }[] = [];
const createdOrderIds: string[] = [];

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json() as T;
  return { status: res.status, data };
}

async function createTestOrder(name: string, body: Record<string, unknown>): Promise<OrderResponse | null> {
  const full = {
    walletAddress: WALLET,
    tokenAddress: TOKEN,
    maxSlippageBps: 300,
    expiresAt: EXPIRES,
    ...body,
  };
  const { status, data } = await api<OrderResponse>('POST', '/orders', full);
  if (status === 201 && (data as OrderResponse).id) {
    createdOrderIds.push((data as OrderResponse).id);
    results.push({ test: name, status: 'PASS', detail: `Created order ${(data as OrderResponse).id} — status: ${(data as OrderResponse).status}` });
    return data as OrderResponse;
  } else {
    results.push({ test: name, status: 'FAIL', detail: `HTTP ${status}: ${JSON.stringify(data)}` });
    return null;
  }
}

async function cancelTestOrder(orderId: string, testName: string): Promise<boolean> {
  const { status, data } = await api<OrderResponse>('PATCH', `/orders/${orderId}/cancel`);
  if (status === 200 && (data as OrderResponse).status === 'CANCELLED') {
    results.push({ test: testName, status: 'PASS', detail: `Cancelled ${orderId}` });
    return true;
  } else {
    results.push({ test: testName, status: 'FAIL', detail: `HTTP ${status}: ${JSON.stringify(data)}` });
    return false;
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Tests ──────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n[1/15] Health Check');
  const { status, data } = await api<{ status: string }>('GET', '/health');
  if (status === 200 && (data as { status: string }).status === 'ok') {
    results.push({ test: 'Health check', status: 'PASS', detail: 'Agent is healthy' });
    log('✓', 'Agent healthy');
  } else {
    results.push({ test: 'Health check', status: 'FAIL', detail: `HTTP ${status}` });
    log('✗', `Agent not healthy: HTTP ${status}`);
    throw new Error('Agent not running — aborting tests');
  }
}

async function testTokenState() {
  console.log('\n[2/15] Fetch Token State');
  const { status, data } = await api<TokenState>('GET', `/token/${TOKEN}`);
  if (status === 200 && (data as TokenState).name) {
    const d = data as TokenState;
    log('✓', `Token: ${d.symbol} (${d.name})`);
    log('  ', `Progress: ${d.progress}, Graduated: ${d.isGraduated}, Locked: ${d.isLocked}`);
    log('  ', `BuyAmountOut: ${d.buyAmountOut}, SellAmountOut: ${d.sellAmountOut}`);

    // Calculate current price
    const buyAmtOut = BigInt(d.buyAmountOut);
    if (buyAmtOut > 0n) {
      const priceWei = (10n ** 18n * 10n ** 18n) / buyAmtOut;
      const priceNum = Number(priceWei) / 1e18;
      log('  ', `Estimated price: ${priceNum.toFixed(12)} MON/token`);
    }
    results.push({ test: 'Fetch token state', status: 'PASS', detail: `${d.symbol} — progress ${d.progress}` });
    return data as TokenState;
  } else {
    results.push({ test: 'Fetch token state', status: 'FAIL', detail: `HTTP ${status}: ${JSON.stringify(data)}` });
    log('✗', `Failed to fetch token state`);
    return null;
  }
}

async function testQuote() {
  console.log('\n[3/15] Fetch Quote');
  const amt = '10000000000000000'; // 0.01 MON
  const { status, data } = await api<{ router: string; amountOut: string }>('GET', `/quote?token=${TOKEN}&amount=${amt}&isBuy=true`);
  if (status === 200 && (data as { amountOut: string }).amountOut) {
    const d = data as { router: string; amountOut: string };
    log('✓', `Buy 0.01 MON → ${d.amountOut} tokens via ${d.router}`);
    results.push({ test: 'Fetch quote (BUY)', status: 'PASS', detail: `amountOut: ${d.amountOut}` });
  } else {
    results.push({ test: 'Fetch quote (BUY)', status: 'FAIL', detail: `HTTP ${status}` });
    log('✗', 'Quote failed');
  }
}

async function testPriceBelow() {
  console.log('\n[4/15] PRICE_BELOW (BUY)');
  await createTestOrder('PRICE_BELOW buy', {
    direction: 'BUY',
    triggerType: 'PRICE_BELOW',
    triggerValue: '500000000000000', // 0.0005 MON
    inputAmount: '10000000000000000', // 0.01 MON
  });
}

async function testPriceAbove() {
  console.log('\n[5/15] PRICE_ABOVE (SELL)');
  await createTestOrder('PRICE_ABOVE sell', {
    direction: 'SELL',
    triggerType: 'PRICE_ABOVE',
    triggerValue: '2000000000000000', // 0.002 MON
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testMcapBelow() {
  console.log('\n[6/15] MCAP_BELOW (BUY)');
  await createTestOrder('MCAP_BELOW buy', {
    direction: 'BUY',
    triggerType: 'MCAP_BELOW',
    triggerValue: '8650000000000000000000', // 8650 MON mcap (8.65k)
    inputAmount: '10000000000000000', // 0.01 MON
  });
}

async function testMcapAbove() {
  console.log('\n[7/15] MCAP_ABOVE (SELL)');
  await createTestOrder('MCAP_ABOVE sell', {
    direction: 'SELL',
    triggerType: 'MCAP_ABOVE',
    triggerValue: '50000000000000000000000', // 50k MON mcap
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testProgressBelow() {
  console.log('\n[8/15] PROGRESS_BELOW (BUY)');
  await createTestOrder('PROGRESS_BELOW buy', {
    direction: 'BUY',
    triggerType: 'PROGRESS_BELOW',
    triggerValue: '2000', // 20% progress
    inputAmount: '10000000000000000', // 0.01 MON
  });
}

async function testProgressAbove() {
  console.log('\n[9/15] PROGRESS_ABOVE (SELL)');
  await createTestOrder('PROGRESS_ABOVE sell', {
    direction: 'SELL',
    triggerType: 'PROGRESS_ABOVE',
    triggerValue: '9000', // 90% progress
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testPostGraduation() {
  console.log('\n[10/15] POST_GRADUATION (SELL)');
  await createTestOrder('POST_GRADUATION sell', {
    direction: 'SELL',
    triggerType: 'POST_GRADUATION',
    triggerValue: '1',
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testTakeProfit() {
  console.log('\n[11/15] TAKE_PROFIT (SELL)');
  await createTestOrder('TAKE_PROFIT sell', {
    direction: 'SELL',
    triggerType: 'TAKE_PROFIT',
    triggerValue: '5000', // 50% profit
    referencePrice: '1000000000000000', // 0.001 MON entry price
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testStopLoss() {
  console.log('\n[12/15] STOP_LOSS (SELL)');
  await createTestOrder('STOP_LOSS sell', {
    direction: 'SELL',
    triggerType: 'STOP_LOSS',
    triggerValue: '2000', // 20% loss
    referencePrice: '1000000000000000', // 0.001 MON entry price
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testTrailingStop() {
  console.log('\n[13/15] TRAILING_STOP (SELL)');
  await createTestOrder('TRAILING_STOP sell', {
    direction: 'SELL',
    triggerType: 'TRAILING_STOP',
    triggerValue: '1500', // 15% trailing stop
    peakPrice: '1500000000000000', // 0.0015 MON peak
    inputAmount: '1000000000000000000000', // 1000 tokens
  });
}

async function testPriceDropPct() {
  console.log('\n[14/15] PRICE_DROP_PCT (BUY)');
  await createTestOrder('PRICE_DROP_PCT buy', {
    direction: 'BUY',
    triggerType: 'PRICE_DROP_PCT',
    triggerValue: '3000', // 30% drop
    referencePrice: '1000000000000000', // 0.001 MON reference
    inputAmount: '10000000000000000', // 0.01 MON
  });
}

async function testDcaInterval() {
  console.log('\n[15/15] DCA_INTERVAL (BUY)');
  await createTestOrder('DCA_INTERVAL buy', {
    direction: 'BUY',
    triggerType: 'DCA_INTERVAL',
    triggerValue: '3600000', // 1 hour interval
    inputAmount: '10000000000000000', // 0.01 MON per interval
  });
}

// ─── Validation tests ───────────────────────────────────────────

async function testValidation() {
  console.log('\n── Validation Tests ──');

  // Missing required fields
  console.log('\n[V1] Missing required fields');
  const { status: s1, data: d1 } = await api('POST', '/orders', {
    walletAddress: WALLET,
    tokenAddress: TOKEN,
    direction: 'BUY',
    // missing triggerType, triggerValue, inputAmount, expiresAt
  });
  if (s1 === 400) {
    results.push({ test: 'Reject missing fields', status: 'PASS', detail: `400: ${JSON.stringify(d1)}` });
    log('✓', 'Correctly rejected missing fields');
  } else {
    results.push({ test: 'Reject missing fields', status: 'FAIL', detail: `Expected 400, got ${s1}` });
    log('✗', `Expected 400, got ${s1}`);
  }

  // Invalid token address
  console.log('\n[V2] Invalid token address');
  const { status: s2, data: d2 } = await api('POST', '/orders', {
    walletAddress: WALLET,
    tokenAddress: 'not_a_real_address',
    direction: 'BUY',
    triggerType: 'PRICE_BELOW',
    triggerValue: '500000000000000',
    inputAmount: '10000000000000000',
    expiresAt: EXPIRES,
  });
  // This may succeed at API level (validation is in AI chat handler)
  // or fail if server.ts POST /orders also validates
  if (s2 === 400 || s2 === 500) {
    results.push({ test: 'Reject invalid token address', status: 'PASS', detail: `${s2}: ${JSON.stringify(d2)}` });
    log('✓', `Rejected invalid address (HTTP ${s2})`);
  } else if (s2 === 201) {
    // Order was created — server doesn't validate token address on POST /orders, only on AI chat
    results.push({ test: 'Reject invalid token address', status: 'FAIL', detail: 'BUG: POST /orders accepted invalid token address — validation only in AI chat handler' });
    log('⚠', 'POST /orders accepted invalid token address (validation gap!)');
    // Clean up
    if ((d2 as OrderResponse).id) {
      createdOrderIds.push((d2 as OrderResponse).id);
    }
  } else {
    results.push({ test: 'Reject invalid token address', status: 'FAIL', detail: `Unexpected HTTP ${s2}` });
  }

  // Invalid direction
  console.log('\n[V3] Invalid direction');
  const { status: s3, data: d3 } = await api('POST', '/orders', {
    walletAddress: WALLET,
    tokenAddress: TOKEN,
    direction: 'HOLD', // invalid
    triggerType: 'PRICE_BELOW',
    triggerValue: '500000000000000',
    inputAmount: '10000000000000000',
    expiresAt: EXPIRES,
  });
  if (s3 === 400 || s3 === 500) {
    results.push({ test: 'Reject invalid direction', status: 'PASS', detail: `${s3}` });
    log('✓', `Rejected invalid direction (HTTP ${s3})`);
  } else if (s3 === 201) {
    results.push({ test: 'Reject invalid direction', status: 'FAIL', detail: 'BUG: accepted direction="HOLD"' });
    log('⚠', 'Accepted invalid direction "HOLD" (validation gap!)');
    if ((d3 as OrderResponse).id) createdOrderIds.push((d3 as OrderResponse).id);
  } else {
    results.push({ test: 'Reject invalid direction', status: 'FAIL', detail: `Unexpected ${s3}` });
  }

  // Past expiry
  console.log('\n[V4] Past expiry date');
  const { status: s4, data: d4 } = await api('POST', '/orders', {
    walletAddress: WALLET,
    tokenAddress: TOKEN,
    direction: 'BUY',
    triggerType: 'PRICE_BELOW',
    triggerValue: '500000000000000',
    inputAmount: '10000000000000000',
    expiresAt: '2020-01-01T00:00:00.000Z', // past date
  });
  if (s4 === 400) {
    results.push({ test: 'Reject past expiry', status: 'PASS', detail: 'Correctly rejected' });
    log('✓', 'Rejected past expiry date');
  } else if (s4 === 201) {
    results.push({ test: 'Reject past expiry', status: 'FAIL', detail: 'BUG: accepted past expiresAt — will immediately expire in monitor loop' });
    log('⚠', 'Accepted past expiresAt (will expire immediately in monitor)');
    if ((d4 as OrderResponse).id) createdOrderIds.push((d4 as OrderResponse).id);
  } else {
    results.push({ test: 'Reject past expiry', status: 'FAIL', detail: `Unexpected ${s4}` });
  }

  // Zero input amount
  console.log('\n[V5] Zero input amount');
  const { status: s5, data: d5 } = await api('POST', '/orders', {
    walletAddress: WALLET,
    tokenAddress: TOKEN,
    direction: 'BUY',
    triggerType: 'PRICE_BELOW',
    triggerValue: '500000000000000',
    inputAmount: '0',
    expiresAt: EXPIRES,
  });
  if (s5 === 400) {
    results.push({ test: 'Reject zero amount', status: 'PASS', detail: 'Correctly rejected' });
    log('✓', 'Rejected zero input amount');
  } else if (s5 === 201) {
    results.push({ test: 'Reject zero amount', status: 'FAIL', detail: 'BUG: accepted inputAmount=0' });
    log('⚠', 'Accepted zero input amount (validation gap!)');
    if ((d5 as OrderResponse).id) createdOrderIds.push((d5 as OrderResponse).id);
  } else {
    results.push({ test: 'Reject zero amount', status: 'FAIL', detail: `Unexpected ${s5}` });
  }

  // Rate limit: we've done 4 POSTs (V1-V4), need to wait before V5-V6
  await waitForRateLimit('validation V5-V6');

  // Negative slippage
  console.log('\n[V6] Out-of-range slippage');
  const { status: s6, data: d6 } = await api('POST', '/orders', {
    walletAddress: WALLET,
    tokenAddress: TOKEN,
    direction: 'BUY',
    triggerType: 'PRICE_BELOW',
    triggerValue: '500000000000000',
    inputAmount: '10000000000000000',
    maxSlippageBps: 99999, // way too high
    expiresAt: EXPIRES,
  });
  if (s6 === 400) {
    results.push({ test: 'Reject bad slippage', status: 'PASS', detail: 'Correctly rejected' });
    log('✓', 'Rejected out-of-range slippage');
  } else if (s6 === 201) {
    results.push({ test: 'Reject bad slippage', status: 'FAIL', detail: 'BUG: accepted maxSlippageBps=99999' });
    log('⚠', 'Accepted maxSlippageBps=99999 (validation gap!)');
    if ((d6 as OrderResponse).id) createdOrderIds.push((d6 as OrderResponse).id);
  } else {
    results.push({ test: 'Reject bad slippage', status: 'FAIL', detail: `Unexpected ${s6}` });
  }
}

// ─── Order lifecycle tests ──────────────────────────────────────

async function testOrderLifecycle() {
  console.log('\n── Order Lifecycle Tests ──');

  // Create → Read → Cancel → Verify
  console.log('\n[L1] Create → Read → Cancel flow');
  const order = await createTestOrder('Lifecycle: create', {
    direction: 'BUY',
    triggerType: 'PRICE_BELOW',
    triggerValue: '100000000000000', // 0.0001 MON (very low, won't trigger)
    inputAmount: '10000000000000000',
  });

  if (order) {
    // Read it back
    const { status: rs, data: rd } = await api<OrderResponse>('GET', `/orders/${order.id}`);
    if (rs === 200 && (rd as OrderResponse).id === order.id) {
      results.push({ test: 'Lifecycle: read back', status: 'PASS', detail: `Status: ${(rd as OrderResponse).status}` });
      log('✓', `Read back order — status: ${(rd as OrderResponse).status}`);
    } else {
      results.push({ test: 'Lifecycle: read back', status: 'FAIL', detail: `HTTP ${rs}` });
    }

    // Cancel it
    await cancelTestOrder(order.id, 'Lifecycle: cancel');

    // Verify cancelled
    const { data: cd } = await api<OrderResponse>('GET', `/orders/${order.id}`);
    if ((cd as OrderResponse).status === 'CANCELLED') {
      results.push({ test: 'Lifecycle: verify cancelled', status: 'PASS', detail: 'Status is CANCELLED' });
      log('✓', 'Verified status = CANCELLED');
    } else {
      results.push({ test: 'Lifecycle: verify cancelled', status: 'FAIL', detail: `Status: ${(cd as OrderResponse).status}` });
    }

    // Try to cancel again (should handle gracefully)
    const { status: dc } = await api('PATCH', `/orders/${order.id}/cancel`);
    if (dc === 200 || dc === 400) {
      results.push({ test: 'Lifecycle: double cancel', status: 'PASS', detail: `HTTP ${dc} (no crash)` });
      log('✓', `Double cancel handled (HTTP ${dc})`);
    } else {
      results.push({ test: 'Lifecycle: double cancel', status: 'FAIL', detail: `HTTP ${dc}` });
    }
  }

  // List orders for wallet
  console.log('\n[L2] List orders by wallet');
  const { status: ls, data: ld } = await api<OrderResponse[]>('GET', `/orders?wallet=${WALLET}`);
  if (ls === 200 && Array.isArray(ld)) {
    results.push({ test: 'List orders by wallet', status: 'PASS', detail: `Found ${(ld as OrderResponse[]).length} orders` });
    log('✓', `Found ${(ld as OrderResponse[]).length} orders for test wallet`);
  } else {
    results.push({ test: 'List orders by wallet', status: 'FAIL', detail: `HTTP ${ls}` });
  }

  // Orderbook
  console.log('\n[L3] Orderbook');
  const { status: os, data: od } = await api<{ buys: unknown[]; sells: unknown[] }>('GET', `/orderbook/${TOKEN}`);
  if (os === 200) {
    const ob = od as { buys: unknown[]; sells: unknown[] };
    results.push({ test: 'Orderbook', status: 'PASS', detail: `buys: ${ob.buys?.length ?? '?'}, sells: ${ob.sells?.length ?? '?'}` });
    log('✓', `Orderbook loaded`);
  } else {
    results.push({ test: 'Orderbook', status: 'FAIL', detail: `HTTP ${os}` });
  }
}

// ─── Cleanup ────────────────────────────────────────────────────

async function cleanup() {
  console.log('\n── Cleanup: Cancelling all test orders ──');
  let cancelled = 0;
  let failed = 0;
  for (const id of createdOrderIds) {
    try {
      const { status } = await api('PATCH', `/orders/${id}/cancel`);
      if (status === 200) cancelled++;
      else failed++;
    } catch {
      failed++;
    }
  }
  console.log(`  Cancelled ${cancelled} orders, ${failed} failed/already cancelled`);
}

// ─── Report ─────────────────────────────────────────────────────

function printReport() {
  console.log('\n' + '='.repeat(70));
  console.log('  PAPER TRADING TEST REPORT');
  console.log('='.repeat(70));

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const skip = results.filter(r => r.status === 'SKIP').length;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
    const color = r.status === 'PASS' ? '\x1b[32m' : r.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    console.log(`  ${color}${icon}\x1b[0m ${r.test}`);
    console.log(`    ${r.detail}`);
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`  Total: ${results.length} | \x1b[32mPASS: ${pass}\x1b[0m | \x1b[31mFAIL: ${fail}\x1b[0m | \x1b[33mSKIP: ${skip}\x1b[0m`);
  console.log('='.repeat(70));

  if (fail > 0) {
    console.log('\n\x1b[31m  ⚠ BUGS FOUND — see FAIL entries above for details\x1b[0m\n');
  } else {
    console.log('\n\x1b[32m  ✓ All tests passed!\x1b[0m\n');
  }
}

// ─── Main ───────────────────────────────────────────────────────

async function waitForRateLimit(label: string) {
  const waitSec = Math.ceil(RATE_LIMIT_WAIT_MS / 1000);
  process.stdout.write(`\n  ⏳ Rate limit cooldown (${waitSec}s) for ${label}...`);
  const start = Date.now();
  while (Date.now() - start < RATE_LIMIT_WAIT_MS) {
    await sleep(5000);
    const remaining = Math.ceil((RATE_LIMIT_WAIT_MS - (Date.now() - start)) / 1000);
    process.stdout.write(`\r  ⏳ Rate limit cooldown (${remaining}s remaining) for ${label}...   `);
  }
  console.log(' done');
}

async function main() {
  console.log('='.repeat(70));
  console.log('  Paper Trading Test — All Trigger Types');
  console.log(`  Token: ${TOKEN}`);
  console.log(`  Agent: ${API}`);
  console.log(`  Time:  ${new Date().toISOString()}`);
  console.log(`  NOTE:  Rate limit is ${RATE_LIMIT_BATCH} POST/60s — test will pause between batches`);
  console.log('='.repeat(70));

  try {
    // Health & state (GET endpoints, no rate limit issues)
    await testHealth();
    await testTokenState();
    await testQuote();

    // ── Batch 1: First 4 trigger types ──
    console.log('\n── Trigger Type Tests — Batch 1/3 ──');
    await testPriceBelow();
    await testPriceAbove();
    await testMcapBelow();
    await testMcapAbove();

    await waitForRateLimit('batch 2');

    // ── Batch 2: Next 4 trigger types ──
    console.log('\n── Trigger Type Tests — Batch 2/3 ──');
    await testProgressBelow();
    await testProgressAbove();
    await testPostGraduation();
    await testTakeProfit();

    await waitForRateLimit('batch 3');

    // ── Batch 3: Last 4 trigger types ──
    console.log('\n── Trigger Type Tests — Batch 3/3 ──');
    await testStopLoss();
    await testTrailingStop();
    await testPriceDropPct();
    await testDcaInterval();

    await waitForRateLimit('validation tests');

    // Validation (6 POST requests → 2 batches)
    await testValidation();

    await waitForRateLimit('lifecycle tests');

    // Lifecycle
    await testOrderLifecycle();

  } catch (err) {
    console.error('\nFATAL:', err);
  } finally {
    await cleanup();
    printReport();
  }
}

main();
