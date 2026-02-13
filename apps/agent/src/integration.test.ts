import { describe, it, expect } from 'vitest';
import { createPublicClient, http, defineChain, parseEther, formatEther } from 'viem';
import { CONTRACTS, lensAbi, tokenAbi } from '@nadfun/shared';

// Live RPC integration tests — these hit the actual Monad mainnet
// Only run these when you want to verify chain connectivity

const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
});

const client = createPublicClient({ chain: monad, transport: http('https://rpc.monad.xyz') });

const DISCLOSURE_TOKEN = '0x0dfbc608339aea55f5eeede640335dac062a7777';
const AGENT_WALLET = '0xd1ef3e71d4a18d0e81b3f4b7c538e3a1026e38e7';

describe('Chain connectivity', () => {
  it('returns correct chain ID (143)', async () => {
    const chainId = await client.getChainId();
    expect(chainId).toBe(143);
  });
});

describe('Lens contract reads', () => {
  it('reads token progress via Lens.getProgress', async () => {
    const progress = await client.readContract({
      address: CONTRACTS.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: 'getProgress',
      args: [DISCLOSURE_TOKEN as `0x${string}`],
    });
    expect(typeof progress).toBe('bigint');
    expect(progress).toBeGreaterThanOrEqual(0n);
  });

  it('reads isGraduated for token', async () => {
    const isGraduated = await client.readContract({
      address: CONTRACTS.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: 'isGraduated',
      args: [DISCLOSURE_TOKEN as `0x${string}`],
    });
    expect(typeof isGraduated).toBe('boolean');
  });

  it('reads isLocked for token', async () => {
    const isLocked = await client.readContract({
      address: CONTRACTS.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: 'isLocked',
      args: [DISCLOSURE_TOKEN as `0x${string}`],
    });
    expect(typeof isLocked).toBe('boolean');
  });

  it('gets buy quote (getAmountOut with isBuy=true)', async () => {
    const result = await client.readContract({
      address: CONTRACTS.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: 'getAmountOut',
      args: [DISCLOSURE_TOKEN as `0x${string}`, parseEther('0.1'), true],
    });
    const [router, amountOut] = result as [string, bigint];
    expect(router).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(amountOut).toBeGreaterThan(0n);
    console.log(`  Buy 0.1 MON → ${formatEther(amountOut)} DISCLOSURE via ${router}`);
  });

  it('gets sell quote (getAmountOut with isBuy=false)', async () => {
    const result = await client.readContract({
      address: CONTRACTS.LENS as `0x${string}`,
      abi: lensAbi,
      functionName: 'getAmountOut',
      args: [DISCLOSURE_TOKEN as `0x${string}`, parseEther('100'), false],
    });
    const [router, amountOut] = result as [string, bigint];
    expect(router).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(amountOut).toBeGreaterThanOrEqual(0n);
    console.log(`  Sell 100 DISCLOSURE → ${formatEther(amountOut)} MON via ${router}`);
  });
});

describe('Multicall batching', () => {
  it('batches multiple Lens calls via multicall3', async () => {
    const addr = DISCLOSURE_TOKEN as `0x${string}`;
    const lensAddr = CONTRACTS.LENS as `0x${string}`;
    const oneToken = parseEther('1');

    const results = await client.multicall({
      contracts: [
        { address: addr, abi: tokenAbi, functionName: 'name' },
        { address: addr, abi: tokenAbi, functionName: 'symbol' },
        { address: lensAddr, abi: lensAbi, functionName: 'isGraduated', args: [addr] },
        { address: lensAddr, abi: lensAbi, functionName: 'isLocked', args: [addr] },
        { address: lensAddr, abi: lensAbi, functionName: 'getProgress', args: [addr] },
        { address: lensAddr, abi: lensAbi, functionName: 'getAmountOut', args: [addr, oneToken, true] },
        { address: lensAddr, abi: lensAbi, functionName: 'getAmountOut', args: [addr, oneToken, false] },
      ],
    });

    // All 7 calls should succeed
    results.forEach((r, i) => {
      expect(r.status).toBe('success');
    });

    console.log(`  Name: ${results[0].result}`);
    console.log(`  Symbol: ${results[1].result}`);
    console.log(`  Graduated: ${results[2].result}`);
    console.log(`  Locked: ${results[3].result}`);
    console.log(`  Progress: ${results[4].result}`);
  });
});

describe('Token ERC20 reads', () => {
  it('reads token name', async () => {
    const name = await client.readContract({
      address: DISCLOSURE_TOKEN as `0x${string}`,
      abi: tokenAbi,
      functionName: 'name',
    });
    expect(typeof name).toBe('string');
    expect((name as string).length).toBeGreaterThan(0);
  });

  it('reads token symbol', async () => {
    const symbol = await client.readContract({
      address: DISCLOSURE_TOKEN as `0x${string}`,
      abi: tokenAbi,
      functionName: 'symbol',
    });
    expect(typeof symbol).toBe('string');
  });

  it('reads agent wallet token balance', async () => {
    const balance = await client.readContract({
      address: DISCLOSURE_TOKEN as `0x${string}`,
      abi: [{
        name: 'balanceOf', type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      }],
      functionName: 'balanceOf',
      args: [AGENT_WALLET as `0x${string}`],
    });
    expect(typeof balance).toBe('bigint');
    console.log(`  Agent DISCLOSURE balance: ${formatEther(balance as bigint)}`);
  });
});

describe('Agent wallet', () => {
  it('has MON balance for gas', async () => {
    const balance = await client.getBalance({ address: AGENT_WALLET as `0x${string}` });
    console.log(`  Agent MON balance: ${formatEther(balance)}`);
    // Agent should have at least some MON for gas
    expect(balance).toBeGreaterThan(0n);
  });
});
