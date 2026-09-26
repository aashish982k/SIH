import { env } from '../config/env';

/**
 * Local sentence embeddings (no text leaves the server).
 * The model is downloaded from Hugging Face on first use and cached.
 */
type Extractor = (texts: string[], opts: { pooling: 'mean'; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

let extractorPromise: Promise<Extractor> | null = null;
let lastError: string | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const pipe = await pipeline('feature-extraction', env.EMBEDDING_MODEL, { dtype: 'fp32' } as any);
      return pipe as unknown as Extractor;
    })().catch((err) => {
      extractorPromise = null;
      lastError = err?.message ?? String(err);
      throw err;
    });
  }
  return extractorPromise;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const extractor = await getExtractor();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32).map((t) => t.replace(/\s+/g, ' ').slice(0, 2000));
    const tensor = await extractor(batch, { pooling: 'mean', normalize: true });
    out.push(...tensor.tolist());
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}

export function embeddingStatus() {
  return { model: env.EMBEDDING_MODEL, dimension: env.EMBEDDING_DIMENSION, error: lastError };
}
