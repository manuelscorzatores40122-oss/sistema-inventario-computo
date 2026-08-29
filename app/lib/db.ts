import { Pool, PoolClient } from 'pg';

let pool: Pool;

export const initializePool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false,
      },
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
