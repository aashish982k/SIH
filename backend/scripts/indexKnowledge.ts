import 'dotenv/config';
import { pool, db } from '../src/config/db';
import { sql } from 'drizzle-orm';
import { ensureCollection } from '../src/config/qdrant';
import { indexEvents } from '../src/services/knowledgeService';

/** Rebuilds the Qdrant collection and the event chunks from MySQL. */
async function main() {
  await ensureCollection({ recreate: true });
  await db.execute(sql`DELETE FROM knowledge_chunks WHERE source_type = 'event'`);
  const { rows } = await db.execute(sql`SELECT id FROM operational_events WHERE verified = TRUE`);
  const ids = rows.map((r: any) => r.id);
  console.log(`🧠  Embedding ${ids.length} events locally (first run downloads the model)...`);
  for (let i = 0; i < ids.length; i += 100) await indexEvents(ids.slice(i, i + 100));
  const { rows: r2 } = await db.execute(sql`SELECT COUNT(*) AS n FROM knowledge_chunks WHERE is_embedded = TRUE`);
  const n = Number((r2[0] as any).n);
  console.log(`✅  ${n} chunks embedded and indexed in Qdrant`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('❌  Indexing failed:', err);
  await pool.end();
  process.exit(1);
});
