import { Pool, PoolClient } from 'pg';

const globalForDb = globalThis as unknown as { pgPool?: Pool; pgPoolErrorHandler?: boolean };

export const initializePool = (): Pool => {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida en el entorno (.env)');
    }

    globalForDb.pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 120000, // 2 minutes to keep connection warm across clicks
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000, // Sends TCP keep-alive probes every 10s to prevent disconnects
    });
  }
  if (!globalForDb.pgPoolErrorHandler) {
    // Neon puede cerrar una conexión inactiva. Consumir este evento evita que
    // un socket ocioso desconectado termine el proceso y falle el siguiente login.
    globalForDb.pgPool.on('error', (error: Error & { code?: string }) => {
      console.error('Se cerró una conexión inactiva de base de datos:', error.code || error.name);
    });
    globalForDb.pgPoolErrorHandler = true;
  }

  return globalForDb.pgPool;
};

export const query = async (text: string, params?: any[]) => {
  const pool = initializePool();
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    if (/^\s*SELECT\b/i.test(text) && (err?.code === 'ECONNRESET' || err?.message?.includes('Connection terminated') || err?.code === '57P01')) {
      return await pool.query(text, params);
    }
    throw err;
  }
};

export const getClient = async (): Promise<PoolClient> => {
  const pool = initializePool();
  try {
    return await pool.connect();
  } catch (err: any) {
    if (err?.code === 'ECONNRESET' || err?.message?.includes('socket disconnected')) {
      return await pool.connect();
    }
    throw err;
  }
};
