import 'dotenv/config';

import { seedUsers } from '../database/seeds/01_users';
import { seedWells } from '../database/seeds/02_wells';
import { seedFormations } from '../database/seeds/03_formations';
import { seedEvents } from '../database/seeds/04_events';

async function runSeeds(): Promise<void> {
  console.log('🌱  Starting database seed...\n');

  try {
    console.log('👤  Seeding users...');
    await seedUsers();

    console.log('🛢️   Seeding wells...');
    await seedWells();

    console.log('🪨   Seeding formations...');
    await seedFormations();

    console.log('⚠️   Seeding operational events...');
    await seedEvents();

    console.log('\n✅  All seeds completed successfully!');
    console.log('\n📋  Default credentials:');
    console.log('  Admin:    admin@nwis.com    / admin1234');
    console.log('  Engineer: rahul.sharma@nwis.com / engineer1234');
    console.log('  Operator: operator@nwis.com / operator1234');
  } catch (err: any) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runSeeds();
