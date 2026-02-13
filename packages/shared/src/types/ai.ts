export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  name: string;
  generateExplanation(messages: AiMessage[]): Promise<string>;
}

export interface AiProviderConfig {
  groqApiKey?: string;
  claudeApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  preferred: 'auto' | 'groq' | 'claude' | 'openai' | 'gemini';
}
