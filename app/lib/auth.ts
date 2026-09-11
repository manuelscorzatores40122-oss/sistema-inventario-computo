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
  const result = await query(
    'SELECT * FROM usuarios WHERE email = $1',
    [email]
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
  correo_personal?: string
) => {
  const hashedPassword = await hashPassword(password);
  const result = await query(
    'INSERT INTO usuarios (email, nombre, apellido, password, role, telefono, correo_personal) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, nombre, apellido, role',
    [email, nombre, apellido, hashedPassword, role, telefono, correo_personal || null]
  );
  return result.rows[0];
};
