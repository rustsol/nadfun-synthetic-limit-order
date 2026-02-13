import type { AiMessage, AiProvider, AiProviderConfig } from '@nadfun/shared';
import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { GroqProvider } from './groq.js';
import { createProviderOrder } from './provider.js';

function createProvider(name: string, apiKey: string): AiProvider | null {
  switch (name) {
    case 'groq': return new GroqProvider(apiKey);
    case 'claude': return new ClaudeProvider(apiKey);
    case 'openai': return new OpenAIProvider(apiKey);
    case 'gemini': return new GeminiProvider(apiKey);
    default: return null;
  }
}

function getApiKey(config: AiProviderConfig, name: string): string | undefined {
  switch (name) {
    case 'groq': return config.groqApiKey;
    case 'claude': return config.claudeApiKey;
    case 'openai': return config.openaiApiKey;
    case 'gemini': return config.geminiApiKey;
    default: return undefined;
  }
}

export async function getExplanation(
  messages: AiMessage[],
  config: AiProviderConfig
): Promise<{ text: string; provider: string }> {
  const order = createProviderOrder(config.preferred);

  for (const providerName of order) {
    const key = getApiKey(config, providerName);
    if (!key) continue;

    try {
      const provider = createProvider(providerName, key);
      if (!provider) continue;
      const text = await provider.generateExplanation(messages);
      return { text, provider: providerName };
    } catch (error) {
      console.warn(`AI provider ${providerName} failed, trying next...`, error);
    }
  }

  // Check if NO keys were configured at all
  const hasAnyKey = order.some(name => !!getApiKey(config, name));
  return {
    text: hasAnyKey
      ? 'AI providers are currently unavailable. Please try again later or check your API keys in Settings.'
      : 'No AI API keys configured. Go to Settings to add your Groq, Claude, OpenAI, or Gemini API key.',
    provider: 'none',
  };
}
