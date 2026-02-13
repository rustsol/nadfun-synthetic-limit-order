import type { AiProviderConfig } from '@nadfun/shared';
import { getExplanation } from './fallback.js';
import { buildRiskCheckPrompt } from './prompts.js';

export interface RiskCheckResult {
  execute: boolean;
  confidence: number;
  reasoning: string;
  provider: string;
}

export async function performRiskCheck(
  context: {
    tokenSymbol: string;
    tokenName: string;
    direction: string;
    triggerType: string;
    inputAmount: string;
    estimatedOutput: string;
    currentPrice: string;
    slippageBps: number;
    isGraduated: boolean;
    progress: string;
    volume?: string;
    holderCount?: number;
  },
  aiConfig: AiProviderConfig
): Promise<RiskCheckResult> {
  const messages = buildRiskCheckPrompt(context);
  const result = await getExplanation(messages, aiConfig);

  try {
    // Parse the JSON response from AI
    const parsed = JSON.parse(result.text);
    return {
      execute: parsed.execute !== false, // default to true
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || result.text,
      provider: result.provider,
    };
  } catch {
    // If AI response isn't valid JSON, default to execute (fail-open)
    return {
      execute: true,
      confidence: 0.3,
      reasoning: `AI response unparseable, defaulting to execute. Raw: ${result.text.slice(0, 100)}`,
      provider: result.provider,
    };
  }
}
