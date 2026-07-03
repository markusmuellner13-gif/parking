import { NextRequest, NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";

export type TicketRow = {
  id: string;
  plate: string;
  zoneId: string;
  zoneName: string;
  zoneLat: number | null;
  zoneLng: number | null;
  priceHourCents: number;
  priceCents: number;
  currency: string;
  startAt: number;
  endAt: number;
  stoppedAt: number | null;
  status: "active" | "stopped" | "expired";
};

function mapRow(r: Record<string, unknown>): TicketRow {
  const endAt = Number(r.end_at);
  const stopped = r.stopped_at != null;
  let status = String(r.status) as TicketRow["status"];
  if (status === "active" && !stopped && endAt <= Date.now()) status = "expired";
  return {
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
    endAt,
    stoppedAt: r.stopped_at != null ? Number(r.stopped_at) : null,
    status,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const c = await db();
    const res = await c.execute({
      sql: "SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [user.id],
    });
    const tickets = res.rows.map((r) => mapRow(r as unknown as Record<string, unknown>));
    return NextResponse.json({ tickets });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const vehicleId = String(body.vehicleId ?? "");
    const minutes = Math.round(Number(body.minutes));
    const zone = body.zone as {
      id?: string; name?: string; lat?: number; lng?: number;
      priceHourCents?: number | null; maxStayMinutes?: number | null;
    } | undefined;

    if (!zone?.id || !zone?.name) return jsonError("Keine Parkzone ausgewählt.");
    if (!vehicleId) return jsonError("Ein Fahrzeug mit Kennzeichen ist für den Kauf erforderlich.");
    if (!isFinite(minutes) || minutes < 15 || minutes > 1440) return jsonError("Parkdauer muss zwischen 15 Minuten und 24 Stunden liegen.");
    if (zone.maxStayMinutes != null && minutes > zone.maxStayMinutes) {
      return jsonError(`In dieser Zone sind maximal ${zone.maxStayMinutes} Minuten erlaubt.`);
    }

    const c = await db();
    const veh = await c.execute({
      sql: "SELECT id, plate FROM vehicles WHERE id = ? AND user_id = ?",
      args: [vehicleId, user.id],
    });
    const vrow = veh.rows[0];
    if (!vrow) return jsonError("Fahrzeug nicht gefunden – bitte Kennzeichen anlegen.", 404);

    const activeForVehicle = await c.execute({
      sql: "SELECT id FROM tickets WHERE user_id = ? AND vehicle_id = ? AND status = 'active' AND end_at > ?",
      args: [user.id, vehicleId, Date.now()],
    });
    if (activeForVehicle.rows.length > 0) {
      return jsonError("Für dieses Kennzeichen läuft bereits ein Parkschein.", 409);
    }

    const priceHourCents = Math.max(0, Math.round(Number(zone.priceHourCents ?? 0)));
    const priceCents = Math.round((priceHourCents * minutes) / 60);
    const now = Date.now();
    const id = newId();

    await c.execute({
      sql: `INSERT INTO tickets
        (id, user_id, vehicle_id, plate, zone_id, zone_name, zone_lat, zone_lng,
         price_hour_cents, price_cents, currency, start_at, end_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EUR', ?, ?, 'active', ?)`,
      args: [
        id, user.id, vehicleId, String(vrow.plate), String(zone.id), String(zone.name),
        zone.lat ?? null, zone.lng ?? null,
        priceHourCents, priceCents, now, now + minutes * 60_000, now,
      ],
    });

    const res = await c.execute({ sql: "SELECT * FROM tickets WHERE id = ?", args: [id] });
    return NextResponse.json({ ticket: mapRow(res.rows[0] as unknown as Record<string, unknown>) });
  } catch (err) {
    return handleError(err);
  }
}
