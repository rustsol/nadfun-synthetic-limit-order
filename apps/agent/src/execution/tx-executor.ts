import { createWalletClient, http, encodeFunctionData, maxUint256, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from '@nadfun/shared';
import type { UnsignedTxPayload } from '@nadfun/shared';
import { publicClient } from '../chain/client.js';

const rpcUrl = process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz';

const erc20Abi = [
  {
    name: 'allowance',
    type: 'function' as const,
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' as const,
  },
  {
    name: 'approve',
    type: 'function' as const,
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable' as const,
  },
] as const;

export async function executeTransaction(
  privateKey: string,
  tx: UnsignedTxPayload
): Promise<{ txHash: Hash; success: boolean; error?: string }> {
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: monad,
      transport: http(rpcUrl),
    });

    const txHash = await walletClient.sendTransaction({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: BigInt(tx.value || '0'),
    });

    // Wait for receipt (with timeout)
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      return {
        txHash,
        success: receipt.status === 'success',
        error: receipt.status !== 'success' ? 'Transaction reverted' : undefined,
      };
    } catch (receiptErr) {
      // tx was sent but we couldn't get receipt — still return txHash
      return {
        txHash,
        success: true, // optimistic — tx was sent
      };
    }
  } catch (err: any) {
    return {
      txHash: '0x' as Hash,
      success: false,
      error: err.shortMessage || err.message || 'Transaction failed',
    };
  }
}

export async function ensureApproval(
  privateKey: string,
  tokenAddress: string,
  spenderAddress: string,
  requiredAmount: bigint
): Promise<{ approved: boolean; txHash?: Hash; error?: string }> {
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, spenderAddress as `0x${string}`],
    });

    if (currentAllowance >= requiredAmount) {
      return { approved: true };
    }

    // Send approve(maxUint256) so we don't need to approve again
    console.log(`Approving ${spenderAddress} to spend ${tokenAddress}...`);

    const walletClient = createWalletClient({
      account,
      chain: monad,
      transport: http(rpcUrl),
    });

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress as `0x${string}`, maxUint256],
    });

    const txHash = await walletClient.sendTransaction({
      to: tokenAddress as `0x${string}`,
      data,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status === 'success') {
      console.log(`Approval confirmed: ${txHash}`);
      return { approved: true, txHash };
    }

    return { approved: false, error: 'Approval transaction reverted' };
  } catch (err: any) {
    return {
      approved: false,
      error: err.shortMessage || err.message || 'Approval failed',
    };
  }
}

export async function getAgentBalance(agentAddress: string): Promise<bigint> {
  return publicClient.getBalance({
    address: agentAddress as `0x${string}`,
  });
}

export async function getTokenBalance(
  tokenAddress: string,
  holderAddress: string
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
      ],
      functionName: 'balanceOf',
      args: [holderAddress as `0x${string}`],
    });
    return balance as bigint;
  } catch {
    return 0n;
  }
}
