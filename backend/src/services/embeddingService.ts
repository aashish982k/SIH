import { env } from '../config/env';

export class EmbeddingService {
  /**
   * Generates embeddings for a given text.
   * Uses Grok API or OpenAI based on the configured key.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
      throw new Error('Text is empty, cannot generate embedding.');
    }

    // Replace newlines which can sometimes affect embedding quality
    const cleanText = text.replace(/\n/g, ' ');

    if (env.GROK_API_KEY) {
      return this.callGrokAPI(cleanText);
    } else if (env.OPENAI_API_KEY) {
      return this.callOpenAIAPI(cleanText);
    } else {
      console.warn('No API key provided for embeddings. Using zero vector fallback.');
      return this.generateZeroVector();
    }
  }

  private async callGrokAPI(text: string): Promise<number[]> {
    try {
      // Assuming Grok API has an OpenAI-compatible embeddings endpoint or similar.
      // E.g., https://api.x.ai/v1/embeddings
      const response = await fetch('https://api.x.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROK_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: env.EMBEDDING_MODEL || 'grok-embedding', // Adjust based on actual grok model names
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding Generation Error (Grok):', error);
      throw error;
    }
  }

  private async callOpenAIAPI(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002', 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding Generation Error (OpenAI):', error);
      throw error;
    }
  }

  private generateZeroVector(): number[] {
    const dim = env.EMBEDDING_DIMENSION || 1536;
    return new Array(dim).fill(0.001);
  }
}

export const embeddingService = new EmbeddingService();
