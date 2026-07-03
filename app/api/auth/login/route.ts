import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const c = await db();
    const res = await c.execute({
      sql: "SELECT id, email, name, password_hash FROM users WHERE email = ?",
      args: [email],
    });
    const row = res.rows[0];
    if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
      return jsonError("E-Mail oder Passwort ist falsch.", 401, "bad_credentials");
    }

    const token = await createSession(String(row.id));
    await setSessionCookie(token);
    return NextResponse.json({
      user: { id: String(row.id), email: String(row.email), name: String(row.name) },
    });
  } catch (err) {
    return handleError(err);
  }
}
