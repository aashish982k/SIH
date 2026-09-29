import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";

const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(client);
