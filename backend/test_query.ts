import { db } from './src/config/db';
import { operational_events } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const res = await db.select().from(operational_events).limit(1);
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();
