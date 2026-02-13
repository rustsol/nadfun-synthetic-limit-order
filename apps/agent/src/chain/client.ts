import { createPublicClient, http } from 'viem';
import { monad } from '@nadfun/shared';

const rpcUrl = process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz';

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(rpcUrl),
  batch: {
    multicall: true,
  },
});
