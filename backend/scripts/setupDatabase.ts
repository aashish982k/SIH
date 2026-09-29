import postgres from "postgres";
import { env } from "../src/config/env";

async function setupDatabase() {
  console.log("Database setup is skipped because PostgreSQL is managed via Supabase (or external provider).");
  console.log("If using a local postgres instance, ensure the database exists.");
  process.exit(0);
}

setupDatabase();
