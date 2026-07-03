import { NextRequest, NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";
import { mapPaymentRow, luhnValid, cardBrand } from "@/lib/payments";

export async function GET() {
  try {
    const user = await requireUser();
    const c = await db();
    const res = await c.execute({
      sql: "SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at",
      args: [user.id],
    });
    return NextResponse.json({
      methods: res.rows.map((r) => mapPaymentRow(r as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Demo payment vault: only brand + last4 are stored, never a full card number.
 * Swap this for a Stripe/PayPal integration before charging real money.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const type = String(body.type ?? "");

    let brand: string | null = null;
    let last4: string | null = null;
    let email: string | null = null;

    if (type === "card") {
      const num = String(body.number ?? "").replace(/[\s-]/g, "");
      const expiry = String(body.expiry ?? "").trim();
      if (num.length < 12 || num.length > 19 || !luhnValid(num)) {
        return jsonError("Ungültige Kartennummer.");
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        return jsonError("Ablaufdatum bitte als MM/JJ angeben.");
      }
      const [mm, yy] = expiry.split("/").map((v) => parseInt(v, 10));
      if (new Date(2000 + yy, mm, 1).getTime() < Date.now()) return jsonError("Diese Karte ist abgelaufen.");
      brand = cardBrand(num);
      last4 = num.slice(-4);
    } else if (type === "paypal") {
      email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Bitte gib deine PayPal-E-Mail an.");
      brand = "PayPal";
    } else if (type === "googlepay" || type === "applepay") {
      brand = type === "googlepay" ? "Google Pay" : "Apple Pay";
    } else {
      return jsonError("Unbekannte Zahlungsart.");
    }

    const c = await db();
    const existing = await c.execute({
      sql: "SELECT COUNT(*) AS n FROM payment_methods WHERE user_id = ?",
      args: [user.id],
    });
    const isFirst = Number(existing.rows[0]?.n ?? 0) === 0;

    const id = newId();
    await c.execute({
      sql: `INSERT INTO payment_methods (id, user_id, type, brand, last4, email, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, user.id, type, brand, last4, email, isFirst ? 1 : 0, Date.now()],
    });
    const res = await c.execute({ sql: "SELECT * FROM payment_methods WHERE id = ?", args: [id] });
    return NextResponse.json({ method: mapPaymentRow(res.rows[0] as unknown as Record<string, unknown>) });
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH { id } – make this the default method */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "");
    if (!id) return jsonError("ID fehlt.");
    const c = await db();
    const own = await c.execute({
      sql: "SELECT id FROM payment_methods WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    });
    if (own.rows.length === 0) return jsonError("Zahlungsmethode nicht gefunden.", 404);
    await c.execute({ sql: "UPDATE payment_methods SET is_default = 0 WHERE user_id = ?", args: [user.id] });
    await c.execute({ sql: "UPDATE payment_methods SET is_default = 1 WHERE id = ?", args: [id] });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonError("ID fehlt.");
    const c = await db();
    await c.execute({
      sql: "DELETE FROM payment_methods WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
