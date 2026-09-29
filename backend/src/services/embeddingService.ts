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

async function embedGeminiBatch(texts: string[]): Promise<number[][]> {
  const model = env.EMBEDDING_MODEL.replace('models/', '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${env.GEMINI_API_KEY}`;
  
  const requests = texts.map(text => ({
    model: `models/${model}`,
    content: { parts: [{ text }] }
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  });

  if (!res.ok) {
    const errText = await res.text();
    lastError = `Gemini API Error: ${errText}`;
    throw new Error(lastError);
  }

  const data = await res.json();
  return data.embeddings.map((e: any) => e.values);
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  
  const out: number[][] = [];
  const isGemini = env.GEMINI_API_KEY && (env.EMBEDDING_MODEL.includes('gemini') || env.EMBEDDING_MODEL.includes('text-embedding'));
  
  if (isGemini) {
    // Process Gemini in batches of 100 max according to API limits (using 32 for safety)
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32).map(t => t.replace(/\s+/g, ' '));
      const embeddings = await embedGeminiBatch(batch);
      out.push(...embeddings);
    }
  } else {
    // Process via HuggingFace locally
    const extractor = await getExtractor();
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32).map((t) => t.replace(/\s+/g, ' ').slice(0, 2000));
      const tensor = await extractor(batch, { pooling: 'mean', normalize: true });
      out.push(...tensor.tolist());
    }
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}

export function embeddingStatus() {
  return { model: env.EMBEDDING_MODEL, dimension: env.EMBEDDING_DIMENSION, error: lastError };
}
