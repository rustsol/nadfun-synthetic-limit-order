import { prisma } from '@nadfun/db';
import type { CreateOrderRequest } from '@nadfun/shared';

export async function getActiveOrders() {
  return prisma.order.findMany({
    where: { status: 'ACTIVE' },
  });
}

export async function getOrdersByWallet(walletAddress: string) {
  return prisma.order.findMany({
    where: { walletAddress: walletAddress.toLowerCase() },
    include: { executionLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { executionLogs: { orderBy: { createdAt: 'desc' } } },
  });
}

export async function createOrder(data: CreateOrderRequest) {
  return prisma.order.create({
    data: {
      walletAddress: data.walletAddress.toLowerCase(),
      tokenAddress: data.tokenAddress.toLowerCase(),
      direction: data.direction,
      inputAmount: data.inputAmount,
      triggerType: data.triggerType,
      triggerValue: data.triggerValue,
      maxSlippageBps: data.maxSlippageBps,
      expiresAt: new Date(data.expiresAt),
      ...(data.referencePrice ? { referencePrice: data.referencePrice } : {}),
      ...(data.peakPrice ? { peakPrice: data.peakPrice } : {}),
    },
  });
}

export async function updateOrderStatus(
  id: string,
  status: 'ACTIVE' | 'TRIGGERED' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED',
  routerUsed?: string,
  txHash?: string
) {
  return prisma.order.update({
    where: { id },
    data: {
      status,
      ...(routerUsed ? { routerUsed } : {}),
      ...(txHash ? { txHash } : {}),
    },
  });
}

export async function getOrdersByToken(tokenAddress: string) {
  return prisma.order.findMany({
    where: {
      tokenAddress: tokenAddress.toLowerCase(),
      status: { in: ['ACTIVE', 'TRIGGERED'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cancelOrder(id: string) {
  return prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}

export async function updatePeakPrice(id: string, newPeak: string) {
  return prisma.order.update({
    where: { id },
    data: { peakPrice: newPeak },
  });
}

export async function reactivateDcaOrder(id: string) {
  return prisma.order.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      lastExecutedAt: new Date(),
    },
  });
}
