import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from './env';
import { initializeSqliteTables } from './sqliteSchema';
import { runMasterSeed } from './masterSeed';

export let isSqlite = false;
let sqliteDb: Database.Database | null = null;
let mysqlPool: mysql.Pool | null = null;

// Initialize MySQL pool object (lazy connection)
try {
  mysqlPool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
  });
} catch (err) {
  mysqlPool = null;
}

/**
 * Initializes SQLite fallback engine if MySQL is unavailable
 */
export function initSqliteEngine(): Database.Database {
  if (sqliteDb) return sqliteDb;

  const dbDir = path.resolve(__dirname, '../../database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'nwis.db');
  console.log(`📦  Initializing local SQLite database: ${dbPath}`);
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  initializeSqliteTables(sqliteDb);
  isSqlite = true;

  // Run master seeds automatically if empty
  runMasterSeed(query).catch((e) => {
    console.error('⚠️  Master seed warning:', e.message);
  });

  return sqliteDb;
}

/**
 * Verify the database connection.
 * Attempts MySQL first; on failure, boots SQLite local fallback.
 */
export async function checkConnection(): Promise<void> {
  if (isSqlite && sqliteDb) {
    return;
  }

  try {
    if (!mysqlPool) throw new Error('MySQL pool not configured');
    const conn = await Promise.race([
      mysqlPool.getConnection(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('MySQL connection timeout (2s)')), 2000)),
    ]);
    await conn.ping();
    conn.release();
    isSqlite = false;
    console.log('✅  MySQL connected successfully');
    
    // Seed MySQL if empty
    runMasterSeed(query).catch(() => {});
  } catch (err: any) {
    console.warn(`⚠️  MySQL unreachable (${err.message}). Activating high-performance local SQLite database engine.`);
    initSqliteEngine();
  }
}

/**
 * Universal query runner — works with both MySQL and SQLite seamlessly.
 */
export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  // If not yet connected or in SQLite mode
  if (isSqlite || !mysqlPool) {
    const db = initSqliteEngine();
    
    // Handle parameter conversion for SQLite (booleans to 0/1, undefined to null)
    const sanitizedParams = params.map((p) => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p === undefined) return null;
      return p;
    });

    const trimmed = sql.trim();
    const isSelect = /^SELECT|^PRAGMA/i.test(trimmed);

    try {
      if (isSelect) {
        // Replace MySQL HAVING without GROUP BY if needed
        let sqliteSql = trimmed;
        if (/HAVING\s+distance_km\s*<=/i.test(sqliteSql) && !/GROUP BY/i.test(sqliteSql)) {
          // Replace with subquery filter or standard where
          sqliteSql = `SELECT * FROM (${sqliteSql.replace(/HAVING\s+distance_km\s*<=\s*\?/i, '')}) WHERE distance_km <= ?`;
        }

        const stmt = db.prepare(sqliteSql);
        const rows = stmt.all(...sanitizedParams);
        return rows as T[];
      } else {
        const stmt = db.prepare(trimmed);
        const info = stmt.run(...sanitizedParams);
        return [
          {
            insertId: info.lastInsertRowid,
            affectedRows: info.changes,
          } as unknown as T,
        ];
      }
    } catch (sqliteErr: any) {
      // If table doesn't exist, re-init schema and retry once
      if (sqliteErr.message?.includes('no such table')) {
        initializeSqliteTables(db);
        const stmt = db.prepare(trimmed);
        if (isSelect) {
          return stmt.all(...sanitizedParams) as T[];
        } else {
          const info = stmt.run(...sanitizedParams);
          return [{ insertId: info.lastInsertRowid, affectedRows: info.changes } as unknown as T];
        }
      }
      throw sqliteErr;
    }
  }

  // MySQL Execution
  try {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows as T[];
  } catch (mysqlErr: any) {
    // If MySQL drops during runtime, fallback to SQLite
    console.warn(`⚠️  MySQL query failed (${mysqlErr.message}). Falling back to SQLite...`);
    isSqlite = true;
    return query<T>(sql, params);
  }
}

/**
 * Run a single-row query and return the first result or undefined.
 */
export async function queryOne<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export const pool = {
  end: async () => {
    if (mysqlPool) await mysqlPool.end().catch(() => {});
    if (sqliteDb) sqliteDb.close();
  },
};
