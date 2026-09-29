import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/** Drops and recreates every NWIS table using PostgreSQL DDL. */
async function setupDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const ddl = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf-8');
    await client.query(ddl);
    console.log('✅  Schema applied to PostgreSQL database.');
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase().catch((err) => {
  console.error('❌  Database setup failed:', err.message);
  process.exit(1);
});
