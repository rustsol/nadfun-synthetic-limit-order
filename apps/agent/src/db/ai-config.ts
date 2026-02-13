import { prisma } from '@nadfun/db';
import type { AiProviderConfig } from '@nadfun/shared';

export async function getAiConfig(walletAddress: string): Promise<AiProviderConfig> {
  const config = await prisma.aiConfig.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });

  if (!config) {
    return {
      preferred: 'auto',
      groqApiKey: undefined,
      claudeApiKey: undefined,
      openaiApiKey: undefined,
      geminiApiKey: undefined,
    };
  }

  return {
    preferred: config.preferredProvider as AiProviderConfig['preferred'],
    groqApiKey: config.groqApiKey || undefined,
    claudeApiKey: config.claudeApiKey || undefined,
    openaiApiKey: config.openaiApiKey || undefined,
    geminiApiKey: config.geminiApiKey || undefined,
  };
}

export async function upsertAiConfig(
  walletAddress: string,
  data: Partial<AiProviderConfig>
) {
  const addr = walletAddress.toLowerCase();
  return prisma.aiConfig.upsert({
    where: { walletAddress: addr },
    create: {
      walletAddress: addr,
      preferredProvider: data.preferred || 'auto',
      groqApiKey: data.groqApiKey || null,
      claudeApiKey: data.claudeApiKey || null,
      openaiApiKey: data.openaiApiKey || null,
      geminiApiKey: data.geminiApiKey || null,
    },
    update: {
      ...(data.preferred ? { preferredProvider: data.preferred } : {}),
      ...(data.groqApiKey !== undefined ? { groqApiKey: data.groqApiKey || null } : {}),
      ...(data.claudeApiKey !== undefined ? { claudeApiKey: data.claudeApiKey || null } : {}),
      ...(data.openaiApiKey !== undefined ? { openaiApiKey: data.openaiApiKey || null } : {}),
      ...(data.geminiApiKey !== undefined ? { geminiApiKey: data.geminiApiKey || null } : {}),
    },
  });
}
