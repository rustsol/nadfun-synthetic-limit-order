import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiMessage, AiProvider } from '@nadfun/shared';

export class GeminiProvider implements AiProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateExplanation(messages: AiMessage[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsg = messages.find(m => m.role === 'user')?.content || '';

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemMsg}\n\n${userMsg}` }] }],
    });

    return result.response.text() || 'Unable to generate explanation.';
  }
}
