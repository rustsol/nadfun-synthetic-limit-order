import { EventEmitter } from 'events';
import type { OrderTriggeredEvent } from '@nadfun/shared';

class AgentEventEmitter extends EventEmitter {
  emitOrderTriggered(event: OrderTriggeredEvent) {
    this.emit('order:triggered', event);
  }

  emitOrderExecuted(data: {
    orderId: string;
    walletAddress: string;
    txHash: string;
    tokenAddress: string;
    direction: string;
  }) {
    this.emit('order:executed', data);
  }

  emitOrderFailed(data: {
    orderId: string;
    walletAddress: string;
    reason: string;
  }) {
    this.emit('order:failed', data);
  }

  emitOrderExpired(orderId: string, walletAddress: string) {
    this.emit('order:expired', { orderId, walletAddress });
  }

  emitOrderAborted(orderId: string, walletAddress: string, reason: string) {
    this.emit('order:aborted', { orderId, walletAddress, reason });
  }
}

export const agentEvents = new AgentEventEmitter();
