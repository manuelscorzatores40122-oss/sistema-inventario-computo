import { Pool, PoolClient } from 'pg';

let pool: Pool;

export const initializePool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida en .env.local');
    }

    pool = new Pool({
      connectionString,
    });
  }

  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const pool = initializePool();

  const client = await pool.connect();

  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export const getClient = async (): Promise<PoolClient> => {
  const pool = initializePool();
  return await pool.connect();
};