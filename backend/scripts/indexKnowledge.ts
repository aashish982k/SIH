import 'dotenv/config';
import { pool, query } from '../src/config/db';
import { ensureCollection } from '../src/config/qdrant';
import { indexEvents } from '../src/services/knowledgeService';

/** Rebuilds the Qdrant collection and the event chunks from MySQL. */
async function main() {
  await ensureCollection({ recreate: true });
  await query(`DELETE FROM knowledge_chunks WHERE source_type = 'event'`);
  const ids = (await query<{ id: string }>(`SELECT id FROM operational_events WHERE verified = TRUE`)).map((r) => r.id);
  console.log(`🧠  Embedding ${ids.length} events locally (first run downloads the model)...`);
  for (let i = 0; i < ids.length; i += 100) await indexEvents(ids.slice(i, i + 100));
  const [{ n }] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM knowledge_chunks WHERE is_embedded = TRUE`);
  console.log(`✅  ${n} chunks embedded and indexed in Qdrant`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('❌  Indexing failed:', err);
  await pool.end();
  process.exit(1);
});
