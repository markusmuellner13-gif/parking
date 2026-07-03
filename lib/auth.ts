import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db, newId } from "./db";

export const SESSION_COOKIE = "pp_session";
const SESSION_DAYS = 30;

export type User = { id: string; email: string; name: string };

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `s1:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [v, saltHex, keyHex] = stored.split(":");
  if (v !== "s1" || !saltHex || !keyHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const c = await db();
  const now = Date.now();
  await c.execute({
    sql: "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    args: [hashToken(token), userId, now + SESSION_DAYS * 86400_000, now],
  });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const c = await db();
    await c.execute({
      sql: "DELETE FROM sessions WHERE token_hash = ?",
      args: [hashToken(token)],
    });
  }
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const c = await db();
  const res = await c.execute({
    sql: `SELECT u.id, u.email, u.name, s.expires_at
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`,
    args: [hashToken(token)],
  });
  const row = res.rows[0];
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) {
    await c.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [hashToken(token)] });
    return null;
  }
  return { id: String(row.id), email: String(row.email), name: String(row.name) };
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) {
    const err = new Error("UNAUTHORIZED") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return user;
}

export function normalizePlate(raw: string): string | null {
  const plate = raw.toUpperCase().replace(/\s+/g, " ").trim();
  if (!/^[A-Z0-9ÄÖÜ][A-Z0-9ÄÖÜ\- ]{1,11}$/.test(plate)) return null;
  return plate;
}

export { newId };
