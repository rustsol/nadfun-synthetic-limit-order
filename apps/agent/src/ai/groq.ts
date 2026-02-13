import Groq from 'groq-sdk';
import type { AiMessage, AiProvider } from '@nadfun/shared';

export class GroqProvider implements AiProvider {
  name = 'groq';
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async generateExplanation(messages: AiMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 256,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content || 'Unable to generate explanation.';
  }
}
