import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env';

export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  ...(env.QDRANT_API_KEY ? { apiKey: env.QDRANT_API_KEY } : {}),
  checkCompatibility: false,
});

const PAYLOAD_INDEXES: Array<{ field: string; type: 'keyword' | 'float' }> = [
  { field: 'well_id', type: 'keyword' },
  { field: 'source_type', type: 'keyword' },
  { field: 'event_type', type: 'keyword' },
  { field: 'formation', type: 'keyword' },
  { field: 'depth_ft', type: 'float' },
];

/**
 * Creates the knowledge collection, or recreates it when the configured
 * embedding dimension changed. Safe to call on every startup.
 */
export async function ensureCollection(opts: { recreate?: boolean } = {}): Promise<void> {
  const name = env.QDRANT_COLLECTION_NAME;
  const { collections } = await qdrantClient.getCollections();
  let exists = collections.some((c) => c.name === name);

  if (exists) {
    const info: any = await qdrantClient.getCollection(name);
    const size = info?.config?.params?.vectors?.size;
    if (opts.recreate || (size && size !== env.EMBEDDING_DIMENSION)) {
      await qdrantClient.deleteCollection(name);
      exists = false;
    }
  }
  if (!exists) {
    await qdrantClient.createCollection(name, { vectors: { size: env.EMBEDDING_DIMENSION, distance: 'Cosine' } });
    for (const { field, type } of PAYLOAD_INDEXES) {
      await qdrantClient.createPayloadIndex(name, { field_name: field, field_schema: type, wait: true });
    }
    console.log(`✅  Qdrant collection "${name}" created (dim=${env.EMBEDDING_DIMENSION})`);
  }
}

export async function checkQdrantConnection(): Promise<void> {
  await qdrantClient.getCollections();
}
