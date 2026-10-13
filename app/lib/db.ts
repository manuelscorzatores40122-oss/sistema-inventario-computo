import { Pool, PoolClient } from 'pg';

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const initializePool = (): Pool => {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida en el entorno (.env)');
    }

    globalForDb.pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return globalForDb.pgPool;
};

export const query = async (text: string, params?: any[]) => {
  const pool = initializePool();
  return await pool.query(text, params);
};

export const getClient = async (): Promise<PoolClient> => {
  const pool = initializePool();
  return await pool.connect();
};