import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env';
import path from 'path';

async function runMigration() {
  console.log('🔄 Running migrations...');
  
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  try {
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
