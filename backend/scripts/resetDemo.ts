import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool, query } from '../src/config/db';
import { env } from '../src/config/env';
import { qdrantClient } from '../src/config/qdrant';

/**
 * Clears everything a demo run creates (alerts, replay samples, uploaded reports and
 * the events confirmed from them) while keeping the seeded offset-well history.
 * Restart the backend afterwards so the replay simulators start from their initial depth.
 */
async function main() {
  const uploaded = await query<{ id: string; file_path: string }>(`SELECT id, file_path FROM documents WHERE file_path IS NOT NULL`);
  const ids = uploaded.map((d) => d.id);
  if (ids.length) {
    const chunks = await query<{ id: string }>(
      `SELECT id FROM knowledge_chunks WHERE document_id IN (${ids.map(() => '?').join(',')})
         OR event_id IN (SELECT id FROM operational_events WHERE source_document_id IN (${ids.map(() => '?').join(',')}))`, [...ids, ...ids]);
    if (chunks.length) {
      try { await qdrantClient.delete(env.QDRANT_COLLECTION_NAME, { wait: true, points: chunks.map((c) => c.id) }); } catch { /* Qdrant optional */ }
    }
    await query(`DELETE FROM operational_events WHERE source_document_id IN (${ids.map(() => '?').join(',')})`, ids);
    await query(`DELETE FROM documents WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    for (const d of uploaded) fs.rmSync(path.resolve(env.UPLOADS_DIR, d.file_path), { force: true });
  }
  await query(`DELETE FROM alerts`);
  await query(`DELETE FROM drilling_parameters`);
  console.log(`✅  Demo reset: removed ${ids.length} uploaded reports, all alerts and replay samples. Restart the backend.`);
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
