import type { AiMessage, AiProvider } from '@nadfun/shared';

export type { AiMessage, AiProvider };

// Track last-used index for round-robin in 'auto' mode
let autoIndex = 0;

export function createProviderOrder(preferred: string): string[] {
  const all = ['groq', 'claude', 'openai', 'gemini'];

  if (preferred === 'auto') {
    // Round-robin: rotate starting provider each call
    const ordered = [...all.slice(autoIndex), ...all.slice(0, autoIndex)];
    autoIndex = (autoIndex + 1) % all.length;
    return ordered;
  }

  const ordered = [preferred, ...all.filter(p => p !== preferred)];
  return ordered;
}
