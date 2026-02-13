import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { monad } from '@nadfun/shared';

export const wagmiConfig = getDefaultConfig({
  appName: 'Synthetic Order Flow',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [monad],
  ssr: true,
});
