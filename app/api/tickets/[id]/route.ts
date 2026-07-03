import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";

/** PATCH { action: "stop" | "extend", minutes?: number } */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const c = await db();
    const res = await c.execute({
      sql: "SELECT * FROM tickets WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    });
    const t = res.rows[0] as unknown as Record<string, unknown> | undefined;
    if (!t) return jsonError("Parkschein nicht gefunden.", 404);

    const now = Date.now();
    const startAt = Number(t.start_at);
    const endAt = Number(t.end_at);
    const priceHour = Number(t.price_hour_cents);
    const isActive = String(t.status) === "active" && t.stopped_at == null && endAt > now;

    if (action === "stop") {
      if (!isActive) return jsonError("Dieser Parkschein ist nicht mehr aktiv.", 409);
      // fair billing: pay only for the minutes actually used (min. 15)
      const usedMin = Math.max(15, Math.ceil((now - startAt) / 60_000));
      const newPrice = Math.min(Number(t.price_cents), Math.round((priceHour * usedMin) / 60));
      await c.execute({
        sql: "UPDATE tickets SET status = 'stopped', stopped_at = ?, end_at = ?, price_cents = ? WHERE id = ?",
        args: [now, now, newPrice, id],
      });
    } else if (action === "extend") {
      if (!isActive) return jsonError("Dieser Parkschein ist nicht mehr aktiv.", 409);
      const minutes = Math.round(Number(body.minutes));
      if (!isFinite(minutes) || minutes < 15 || minutes > 720) return jsonError("Ungültige Verlängerung.");
      const totalMin = Math.round((endAt + minutes * 60_000 - startAt) / 60_000);
      await c.execute({
        sql: "UPDATE tickets SET end_at = ?, price_cents = ? WHERE id = ?",
        args: [endAt + minutes * 60_000, Math.round((priceHour * totalMin) / 60), id],
      });
    } else {
      return jsonError("Unbekannte Aktion.");
    }

    const updated = await c.execute({ sql: "SELECT * FROM tickets WHERE id = ?", args: [id] });
    const r = updated.rows[0] as unknown as Record<string, unknown>;
    return NextResponse.json({
      ticket: {
        id: String(r.id),
        plate: String(r.plate),
        zoneId: String(r.zone_id),
        zoneName: String(r.zone_name),
        zoneLat: r.zone_lat != null ? Number(r.zone_lat) : null,
        zoneLng: r.zone_lng != null ? Number(r.zone_lng) : null,
        priceHourCents: Number(r.price_hour_cents),
        priceCents: Number(r.price_cents),
        currency: String(r.currency),
        startAt: Number(r.start_at),
        endAt: Number(r.end_at),
        stoppedAt: r.stopped_at != null ? Number(r.stopped_at) : null,
        status: String(r.status),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
