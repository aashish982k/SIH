import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env';

export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  ...(env.QDRANT_API_KEY ? { apiKey: env.QDRANT_API_KEY } : {}),
});

/**
 * Creates the knowledge collection if it does not already exist.
 * Safe to call on every startup.
 */
export async function ensureCollection(): Promise<void> {
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
}

/**
 * Verify Qdrant is reachable.
 */
export async function checkQdrantConnection(): Promise<void> {
  await qdrantClient.getCollections();
}
