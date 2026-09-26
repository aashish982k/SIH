import 'dotenv/config';
import { pool } from '../src/config/db';
import { seedUsers } from '../database/seeds/01_users';
import { seedSynthetic } from '../database/seeds/02_synthetic';

async function runSeeds(): Promise<void> {
  console.log('🌱  Seeding...');
  try {
    await seedUsers();
    await seedSynthetic();
    console.log('\n✅  Seed complete. Log in with rahul.sharma@nwis.com / engineer1234');
  } catch (err: any) {
    console.error('❌  Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSeeds();
