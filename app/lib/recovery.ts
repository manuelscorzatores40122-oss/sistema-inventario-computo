import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { query } from './db';

export function normalizeRecoveryCode(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 80) return null;
  const clean = value.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-F0-9]{32}$/.test(clean) ? clean : null;
}
export function recoveryHash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
export function newRecoveryCode() {
  const raw = randomBytes(16).toString('hex').toUpperCase();
  return { code: raw.match(/.{4}/g)!.join('-'), hash: recoveryHash(raw) };
}
export function recoveryMatches(code: string, stored: unknown): boolean {
  const validHash = typeof stored === 'string' && /^[a-f0-9]{64}$/.test(stored);
  const expected = validHash ? stored as string : '0'.repeat(64);
  const equal = timingSafeEqual(Buffer.from(recoveryHash(code), 'hex'), Buffer.from(expected, 'hex'));
  return !!validHash && equal;
}
export function recoveryPasswordError(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128 || new TextEncoder().encode(password).length > 72) {
    return 'La contraseña debe tener al menos 8 caracteres y un máximo de 72 bytes.';
  }
  return password === confirmation ? null : 'Las contraseñas no coinciden.';
}
export async function allowRecoveryAttempt(key: string): Promise<boolean> {
  const result = await query(`INSERT INTO intentos_recuperacion (clave, intentos, inicio)
    VALUES ($1, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (clave) DO UPDATE SET
      intentos = CASE WHEN intentos_recuperacion.inicio <= CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN 1 ELSE intentos_recuperacion.intentos + 1 END,
      inicio = CASE WHEN intentos_recuperacion.inicio <= CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN CURRENT_TIMESTAMP ELSE intentos_recuperacion.inicio END
    RETURNING intentos`, [recoveryHash(key)]);
  return result.rows[0].intentos <= 5;
}
