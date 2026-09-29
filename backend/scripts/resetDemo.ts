import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db, pool } from '../src/config/db';
import { env } from '../src/config/env';
import { qdrantClient } from '../src/config/qdrant';
import { sql } from 'drizzle-orm';

/**
 * Clears everything a demo run creates (alerts, replay samples, uploaded reports and
 * the events confirmed from them) while keeping the seeded offset-well history.
 * Restart the backend afterwards so the replay simulators start from their initial depth.
 */
async function main() {
  const { rows: uploaded } = await db.execute(sql`
    SELECT id, file_path FROM documents WHERE file_path IS NOT NULL
  `) as any;
  const ids: string[] = uploaded.map((d: any) => d.id);

  if (ids.length) {
    const { rows: chunks } = await db.execute(sql`
      SELECT id FROM knowledge_chunks
      WHERE document_id = ANY(${ids}::uuid[])
         OR event_id IN (
           SELECT id FROM operational_events
           WHERE source_document_id = ANY(${ids}::uuid[])
         )
    `) as any;
    if (chunks.length) {
      try {
        await qdrantClient.delete(env.QDRANT_COLLECTION_NAME, { wait: true, points: chunks.map((c: any) => c.id) });
      } catch { /* Qdrant optional */ }
    }
    await db.execute(sql`DELETE FROM operational_events WHERE source_document_id = ANY(${ids}::uuid[])`);
    await db.execute(sql`DELETE FROM documents WHERE id = ANY(${ids}::uuid[])`);
    for (const d of uploaded) fs.rmSync(path.resolve(env.UPLOADS_DIR, d.file_path), { force: true });
  }

  await db.execute(sql`DELETE FROM alerts`);
  await db.execute(sql`DELETE FROM drilling_parameters`);
  console.log(`✅  Demo reset: removed ${ids.length} uploaded reports, all alerts and replay samples. Restart the backend.`);
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
