import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function setupDatabase(): Promise<void> {
  const {
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
  } = process.env;

  // Connect without specifying a database first so we can CREATE DATABASE
  const rootConn = await mysql.createConnection({
    host: MYSQL_HOST ?? 'localhost',
    port: Number(MYSQL_PORT ?? 3306),
    user: MYSQL_USER ?? 'root',
    password: MYSQL_PASSWORD ?? 'secret',
    multipleStatements: true,
  });

  console.log('🔌  Connected to MySQL server');

  // Create database if it doesn't exist
  await rootConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE ?? 'nwis'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✅  Database "${MYSQL_DATABASE ?? 'nwis'}" ensured`);

  await rootConn.changeUser({ database: MYSQL_DATABASE ?? 'nwis' });

  // Run schema.sql
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  await rootConn.query(schema);
  console.log('✅  Schema applied — all tables created');

  await rootConn.end();
  console.log('✅  Database setup complete');
}

setupDatabase().catch((err) => {
  console.error('❌  Database setup failed:', err.message);
  process.exit(1);
});
