import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_cambiar';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: number, role: string) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const getUserById = async (id: number) => {
  const result = await query(
    'SELECT id, email, nombre, apellido, role, telefono, correo_personal, activo FROM usuarios WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email: string) => {
  const cleanInput = email.trim();
  const result = await query(
    'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) OR LOWER(email) = LOWER($1 || \'@colegio.com\') OR LOWER(email) = LOWER($1 || \'@colegio.edu\') OR dni = $1',
    [cleanInput]
  );
  return result.rows[0];
};

export const createUser = async (
  email: string,
  nombre: string,
  apellido: string,
  password: string,
  role: string = 'profesor',
  telefono?: string,
  correo_personal?: string,
  activo: boolean = true,
  dni?: string,
  area?: string
) => {
  const hashedPassword = await hashPassword(password);
  const userDni = dni || email;
  const result = await query(
    `INSERT INTO usuarios (email, nombre, apellido, password, role, telefono, correo_personal, activo, dni, area)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, email, nombre, apellido, role, activo, dni, area`,
    [email, nombre, apellido, hashedPassword, role, telefono || null, correo_personal || null, activo, userDni, area || null]
  );
  return result.rows[0];
};

export type AdminAuthResult =
  | { success: true; user: { id: number; email: string; nombre: string; role: string } }
  | { success: false; error: string; status: 401 | 403 };

export async function requireAdminSession(request: {
  cookies: { get(name: string): { value?: string } | undefined };
  headers: { get(name: string): string | null };
}): Promise<AdminAuthResult> {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return { success: false, error: 'No autenticado. Inicie sesión para continuar.', status: 401 };
  }

  const decoded = verifyToken(token) as { userId?: number; role?: string; exp?: number } | null;
  if (!decoded || !decoded.userId) {
    return { success: false, error: 'Sesión inválida o expirada.', status: 401 };
  }

  if (decoded.role !== 'admin') {
    return { success: false, error: 'Acceso denegado. Se requiere rol de administrador.', status: 403 };
  }

  // Verificar estado y rol real en PostgreSQL Neon
  const dbUser = await getUserById(decoded.userId);
  if (!dbUser) {
    return { success: false, error: 'Usuario no encontrado en el sistema.', status: 401 };
  }

  if (!dbUser.activo) {
    return { success: false, error: 'La cuenta de administrador se encuentra desactivada.', status: 403 };
  }

  if (dbUser.role !== 'admin') {
    return { success: false, error: 'Permisos insuficientes. El usuario no posee rol de administrador.', status: 403 };
  }

  return {
    success: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      nombre: dbUser.nombre,
      role: dbUser.role,
    },
  };
}
