import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

/** Drops and recreates every NWIS table. Uses root so it can also create the database. */
async function setupDatabase(): Promise<void> {
  const db = process.env.MYSQL_DATABASE ?? 'nwis';
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD ?? 'secret',
    multipleStatements: true,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.changeUser({ database: db });
  await conn.query(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf-8'));
  await conn.end();
  console.log(`✅  Schema applied to "${db}"`);
}

setupDatabase().catch((err) => {
  console.error('❌  Database setup failed:', err.message);
  process.exit(1);
});
