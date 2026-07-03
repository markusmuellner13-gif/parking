import { NextRequest, NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Bitte gib eine gültige E-Mail-Adresse an.");
    if (name.length < 2) return jsonError("Bitte gib deinen Namen an.");
    if (password.length < 8) return jsonError("Das Passwort braucht mindestens 8 Zeichen.");

    const c = await db();
    const existing = await c.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (existing.rows.length > 0) return jsonError("Für diese E-Mail existiert bereits ein Konto.", 409);

    const id = newId();
    await c.execute({
      sql: "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, email, name, await hashPassword(password), Date.now()],
    });

    const token = await createSession(id);
    await setSessionCookie(token);
    return NextResponse.json({ user: { id, email, name } });
  } catch (err) {
    return handleError(err);
  }
}
