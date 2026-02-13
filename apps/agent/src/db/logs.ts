import { prisma } from '@nadfun/db';
import type { UnsignedTxPayload } from '@nadfun/shared';

type LogAction = 'CHECK' | 'TRIGGER' | 'ABORT' | 'EXPIRE' | 'USER_SIGNED' | 'TX_CONFIRMED' | 'TX_FAILED';

export async function writeExecutionLog(data: {
  orderId: string;
  action: LogAction;
  currentPrice?: string;
  currentProgress?: string;
  isGraduated?: boolean;
  isLocked?: boolean;
  routerAddress?: string;
  unsignedTxData?: UnsignedTxPayload;
  txHash?: string;
  aiExplanation?: string;
  aiProvider?: string;
  reason?: string;
}) {
  return prisma.executionLog.create({
    data: {
      orderId: data.orderId,
      action: data.action,
      currentPrice: data.currentPrice,
      currentProgress: data.currentProgress,
      isGraduated: data.isGraduated,
      isLocked: data.isLocked,
      routerAddress: data.routerAddress,
      unsignedTxData: data.unsignedTxData ? JSON.parse(JSON.stringify(data.unsignedTxData)) : undefined,
      txHash: data.txHash,
      aiExplanation: data.aiExplanation,
      aiProvider: data.aiProvider,
      reason: data.reason,
    },
  });
}
