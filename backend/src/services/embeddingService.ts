import { env } from '../config/env';

export class EmbeddingService {
  /**
   * Generates embeddings for a given text.
   * Gemini provides embeddings while Groq remains the chat/reasoning provider.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
      throw new Error('Text is empty, cannot generate embedding.');
    }

    // Replace newlines which can sometimes affect embedding quality
    const cleanText = text.replace(/\n/g, ' ');

    if (env.GEMINI_API_KEY) {
      return this.callGeminiAPI(cleanText);
    }

    if (env.OPENAI_API_KEY) {
      return this.callOpenAIAPI(cleanText);
    }

    console.warn('No Gemini or OpenAI embedding API key provided. Using local hash embedding fallback.');
    return this.generateHashVector(cleanText);
  }

  private async callGeminiAPI(text: string): Promise<number[]> {
    try {
      const model = env.GEMINI_EMBEDDING_MODEL || env.EMBEDDING_MODEL;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            outputDimensionality: env.EMBEDDING_DIMENSION,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { embedding?: { values?: unknown } };
      const vector = data.embedding?.values;
      if (!Array.isArray(vector)) throw new Error('Gemini returned no embedding vector');
      if (vector.length !== env.EMBEDDING_DIMENSION) {
        throw new Error(`Gemini embedding dimension ${vector.length} does not match Qdrant dimension ${env.EMBEDDING_DIMENSION}`);
      }
      return vector as number[];
    } catch (error) {
      console.error('Embedding Generation Error (Gemini):', error);
      throw error;
    }
  }

  private async callOpenAIAPI(text: string): Promise<number[]> {
    try {
      const model = env.EMBEDDING_MODEL && env.EMBEDDING_MODEL !== 'grok-embedding'
        ? env.EMBEDDING_MODEL
        : 'text-embedding-3-small';
      const body: Record<string, unknown> = { input: text, model };
      if (model.startsWith('text-embedding-3')) {
        body.dimensions = env.EMBEDDING_DIMENSION;
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      const vector = data.data?.[0]?.embedding;
      if (!Array.isArray(vector)) throw new Error('OpenAI returned no embedding vector');
      if (vector.length !== env.EMBEDDING_DIMENSION) {
        throw new Error(`OpenAI embedding dimension ${vector.length} does not match Qdrant dimension ${env.EMBEDDING_DIMENSION}`);
      }
      return vector;
    } catch (error) {
      console.error('Embedding Generation Error (OpenAI):', error);
      throw error;
    }
  }

  private generateHashVector(text: string): number[] {
    const dim = env.EMBEDDING_DIMENSION || 1536;
    const vector = new Array(dim).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9_./-]+/g) ?? [];

    for (const token of tokens) {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const index = Math.abs(hash) % dim;
      vector[index] += 1;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}

export const embeddingService = new EmbeddingService();
