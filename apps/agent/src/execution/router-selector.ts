import { CONTRACTS } from '@nadfun/shared';

export function selectRouter(routerAddress: string): {
  address: string;
  type: 'bonding_curve' | 'dex';
} {
  const isDex = routerAddress.toLowerCase() === CONTRACTS.DEX_ROUTER.toLowerCase();
  return {
    address: routerAddress,
    type: isDex ? 'dex' : 'bonding_curve',
  };
}
