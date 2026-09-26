import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function setupDatabase(): Promise<void> {
  const {
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
  } = process.env;

  // Connect as root to create database and configure permissions
  const port = Number(MYSQL_PORT ?? 3307);
  const rootConn = await mysql.createConnection({
    host: MYSQL_HOST ?? 'localhost',
    port,
    user: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD ?? 'secret',
    multipleStatements: true,
  });

  console.log(`🔌  Connected to MySQL server on port ${port}`);

  // Create database if it doesn't exist
  await rootConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE ?? 'nwis'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✅  Database "${MYSQL_DATABASE ?? 'nwis'}" ensured`);

  // Grant privileges to application user
  try {
    await rootConn.query(
      `GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE ?? 'nwis'}\`.* TO '${MYSQL_USER ?? 'nwis_user'}'@'%';`
    );
    await rootConn.query('FLUSH PRIVILEGES;');
  } catch {
    // User might not exist or grant not needed
  }

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
  console.error('❌  Database setup failed:', err?.message || err);
  process.exit(1);
});
