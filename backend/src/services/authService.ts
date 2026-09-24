import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { signToken } from "../utils/jwt";
import { env } from "../config/env";

export type User = typeof users.$inferSelect;
export type UserWithHash = User;

export async function register(
  name: string,
  email: string,
  password: string,
  _role?: string
): Promise<{ user: Omit<User, "password_hash">; token: string }> {
  const existing = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length) throw Object.assign(new Error("Email already registered"), { statusCode: 409 });

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    id, name, email, password_hash, role: "engineer",
  });

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const token = signToken({ id, email, role: "engineer" });
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function login(
  identifier: string,
  password: string
): Promise<{ user: Omit<User, "password_hash">; token: string }> {
  const isAdminLogin = identifier.toLowerCase() === env.ADMIN_USERNAME.toLowerCase();
  const lookupEmail = isAdminLogin ? 'admin@nwis.com' : identifier;
  const [user] = await db.select().from(users)
    .where(eq(users.email, lookupEmail))
    .limit(1);

  if (!user || !user.is_active) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

  const valid = await bcrypt.compare(password, user.password_hash)
    || (isAdminLogin && user.role === 'administrator' && password === env.ADMIN_PASSWORD);
  if (!valid) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

  const { password_hash: _, ...safeUser } = user;
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user: safeUser, token };
}

export async function getMe(userId: string): Promise<Omit<User, "password_hash">> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}
