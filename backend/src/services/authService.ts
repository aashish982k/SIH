import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';
import { signToken } from '../utils/jwt';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface UserWithHash extends User {
  password_hash: string;
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<{ user: User; token: string }> {
  const existing = await queryOne<User>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);

  await query(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, password_hash, role]
  );

  const user = await queryOne<User>(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
    [id]
  );

  const token = signToken({ id, email, role });
  return { user: user!, token };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const user = await queryOne<UserWithHash>(
    'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
    [email]
  );
  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const { password_hash: _, ...safeUser } = user;
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user: safeUser as User, token };
}

export async function getMe(userId: string): Promise<User> {
  const user = await queryOne<User>(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user;
}
