import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

async function setupQdrant(): Promise<void> {
  const url = process.env.QDRANT_URL ?? 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;
  const collectionName = process.env.QDRANT_COLLECTION_NAME ?? 'nwis_knowledge';
  const dimension = Number(process.env.EMBEDDING_DIMENSION ?? 1536);

  const client = new QdrantClient({ url, ...(apiKey ? { apiKey } : {}) });

  console.log(`🔌  Connecting to Qdrant at ${url} ...`);
  const collections = await client.getCollections();
  console.log(`✅  Qdrant reachable — ${collections.collections.length} existing collection(s)`);

  const exists = collections.collections.some((c) => c.name === collectionName);

  if (exists) {
    const info = await client.getCollection(collectionName);
    console.log(`ℹ️   Collection "${collectionName}" already exists (vectors config: dim=${dimension})`);
    console.log(`    Points count: ${info.points_count ?? 0}`);
  } else {
    await client.createCollection(collectionName, {
      vectors: { size: dimension, distance: 'Cosine' },
    });
    console.log(`✅  Collection "${collectionName}" created (dim=${dimension}, distance=Cosine)`);
  }

  // Create payload indexes for efficient filtered search
  const payloadIndexes: Array<{ field: string; type: 'keyword' | 'integer' | 'float' }> = [
    { field: 'well_id',       type: 'keyword' },
    { field: 'document_id',   type: 'keyword' },
    { field: 'source_type',   type: 'keyword' },
    { field: 'event_type',    type: 'keyword' },
    { field: 'formation',     type: 'keyword' },
    { field: 'severity',      type: 'keyword' },
    { field: 'depth_ft',      type: 'float'   },
  ];

  for (const { field, type } of payloadIndexes) {
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: field,
        field_schema: type,
      });
    } catch (err: any) {
      const message = String(err?.message ?? err);
      if (!message.toLowerCase().includes('already exists')) {
        throw err;
      }
    }
  }
  console.log('✅  Payload indexes verified');
  console.log('✅  Qdrant setup complete');
}

setupQdrant().catch((err) => {
  console.error('❌  Qdrant setup failed:', err.message);
  process.exit(1);
});
