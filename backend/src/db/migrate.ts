/**
 * Drizzle migration runner — executes pending migrations in src/db/migrations/.
 * Run: npx tsx src/db/migrate.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     ?? "localhost",
    port:     Number(process.env.MYSQL_PORT ?? 3306),
    user:     process.env.MYSQL_USER     ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? "nwis",
    multipleStatements: true,
  });

  const db = drizzle(connection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  console.log("Migrations complete!");

  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
