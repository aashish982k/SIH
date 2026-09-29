import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { users } from '../db/schema';
import { signToken } from '../utils/jwt';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<{ user: User; token: string }> {
  const existing = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

  const password_hash = await bcrypt.hash(password, 12);

  const [inserted] = await db.insert(users).values({
    name,
    email,
    password_hash,
    role: role as any,
  }).returning({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    is_active: users.is_active,
    created_at: users.created_at,
  });

  const token = signToken({ id: inserted.id, email: inserted.email, role: inserted.role });
  return { user: inserted as User, token };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const [row] = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!row || !row.is_active) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const { password_hash: _, ...safeUser } = row;
  const token = signToken({ id: row.id, email: row.email, role: row.role });
  return { user: safeUser as unknown as User, token };
}

export async function getMe(userId: string): Promise<User> {
  const [row] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    is_active: users.is_active,
    created_at: users.created_at,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return row as User;
}
