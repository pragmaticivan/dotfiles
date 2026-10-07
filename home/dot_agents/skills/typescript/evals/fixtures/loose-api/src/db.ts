import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function queryOne(sql: string, params: any[]): Promise<any> {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

export async function queryMany(sql: string, params: any[]) {
  const result = await pool.query(sql, params);
  return result.rows as any[];
}
