import Anthropic from '@anthropic-ai/sdk';
import type { AiMessage, AiProvider } from '@nadfun/shared';

export class ClaudeProvider implements AiProvider {
  name = 'claude';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateExplanation(messages: AiMessage[]): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      system: systemMsg,
      messages: userMsgs,
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : 'Unable to generate explanation.';
  }
}
