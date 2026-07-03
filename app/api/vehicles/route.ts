import { NextRequest, NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { requireUser, normalizePlate } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const c = await db();
    const res = await c.execute({
      sql: "SELECT id, plate, label, created_at FROM vehicles WHERE user_id = ? ORDER BY created_at",
      args: [user.id],
    });
    return NextResponse.json({
      vehicles: res.rows.map((r) => ({
        id: String(r.id),
        plate: String(r.plate),
        label: r.label ? String(r.label) : null,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const plate = normalizePlate(String(body.plate ?? ""));
    if (!plate) return jsonError("Ungültiges Kennzeichen (2–12 Zeichen, Buchstaben/Ziffern).");
    const label = String(body.label ?? "").trim() || null;

    const c = await db();
    const dup = await c.execute({
      sql: "SELECT id FROM vehicles WHERE user_id = ? AND plate = ?",
      args: [user.id, plate],
    });
    if (dup.rows.length > 0) return jsonError("Dieses Kennzeichen ist bereits gespeichert.", 409);

    const id = newId();
    await c.execute({
      sql: "INSERT INTO vehicles (id, user_id, plate, label, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, user.id, plate, label, Date.now()],
    });
    return NextResponse.json({ vehicle: { id, plate, label } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonError("Fahrzeug-ID fehlt.");
    const c = await db();
    const active = await c.execute({
      sql: "SELECT id FROM tickets WHERE user_id = ? AND vehicle_id = ? AND status = 'active' AND end_at > ?",
      args: [user.id, id, Date.now()],
    });
    if (active.rows.length > 0) return jsonError("Für dieses Fahrzeug läuft gerade ein Parkschein.", 409);
    await c.execute({
      sql: "DELETE FROM vehicles WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
