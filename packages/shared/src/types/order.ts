export type Direction = 'BUY' | 'SELL';

export type TriggerType =
  | 'PRICE_BELOW'
  | 'PRICE_ABOVE'
  | 'PROGRESS_BELOW'
  | 'PROGRESS_ABOVE'
  | 'POST_GRADUATION'
  | 'MCAP_BELOW'
  | 'MCAP_ABOVE'
  | 'MCAP_BELOW_USD'
  | 'MCAP_ABOVE_USD'
  | 'TRAILING_STOP'
  | 'TAKE_PROFIT'
  | 'STOP_LOSS'
  | 'DCA_INTERVAL'
  | 'PRICE_DROP_PCT';

export type OrderStatus =
  | 'ACTIVE'
  | 'TRIGGERED'
  | 'EXECUTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED';

export interface CreateOrderRequest {
  walletAddress: string;
  tokenAddress: string;
  direction: Direction;
  inputAmount: string;
  triggerType: TriggerType;
  triggerValue: string;
  maxSlippageBps: number;
  expiresAt: string;
  referencePrice?: string;
  peakPrice?: string;
}

export interface UnsignedTxPayload {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

export interface OrderTriggeredEvent {
  orderId: string;
  tokenAddress: string;
  direction: Direction;
  unsignedTx: UnsignedTxPayload;
  currentPrice: string;
  targetPrice: string;
  aiExplanation: string;
  routerAddress: string;
  timestamp: number;
}
