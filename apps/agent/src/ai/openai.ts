import OpenAI from 'openai';
import type { AiMessage, AiProvider } from '@nadfun/shared';

export class OpenAIProvider implements AiProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateExplanation(messages: AiMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 256,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content || 'Unable to generate explanation.';
  }
}
