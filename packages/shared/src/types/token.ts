export interface TokenState {
  address: string;
  name: string;
  symbol: string;
  isGraduated: boolean;
  isLocked: boolean;
  progress: string;
  routerAddress: string;
  pricePerToken: string;
}

export interface CurveData {
  realMonReserve: bigint;
  realTokenReserve: bigint;
  virtualMonReserve: bigint;
  virtualTokenReserve: bigint;
  k: bigint;
  targetTokenAmount: bigint;
  initVirtualMonReserve: bigint;
  initVirtualTokenReserve: bigint;
}

export interface PriceQuote {
  router: string;
  amountOut: string;
  effectivePrice: string;
  timestamp: number;
}
