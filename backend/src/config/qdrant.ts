import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env';

export let isQdrantAvailable = false;

export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  ...(env.QDRANT_API_KEY ? { apiKey: env.QDRANT_API_KEY } : {}),
});

/**
 * Creates the knowledge collection if it does not already exist.
 * Safe to call on every startup.
 */
export async function ensureCollection(): Promise<void> {
  if (!isQdrantAvailable) return;
  try {
    const collectionName = env.QDRANT_COLLECTION_NAME;
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: env.EMBEDDING_DIMENSION,
          distance: 'Cosine',
        },
      });
      console.log(`✅  Qdrant collection "${collectionName}" created (dim=${env.EMBEDDING_DIMENSION})`);
    } else {
      console.log(`✅  Qdrant collection "${collectionName}" already exists`);
    }
  } catch (err: any) {
    console.warn(`⚠️  Qdrant ensureCollection error: ${err.message}`);
    isQdrantAvailable = false;
  }
}

/**
 * Verify Qdrant is reachable.
 */
export async function checkQdrantConnection(): Promise<void> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Qdrant connection timeout (1.5s)')), 1500)
    );
    await Promise.race([qdrantClient.getCollections(), timeout]);
    isQdrantAvailable = true;
    console.log('✅  Qdrant vector engine connected');
  } catch (err: any) {
    isQdrantAvailable = false;
    console.warn(`ℹ️  Qdrant vector store offline (${err.message}). Using built-in SQL knowledge search.`);
  }
}
