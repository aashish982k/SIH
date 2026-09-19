import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
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

/**
 * Verify the MySQL connection is alive.
 */
export async function checkConnection(): Promise<void> {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

/**
 * Convenience wrapper — runs a parameterised query on the pool.
 */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/**
 * Run a single-row query and return the first result or undefined.
 */
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}
