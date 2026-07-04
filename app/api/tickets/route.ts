import { NextRequest, NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";
import { mapPaymentRow, paymentLabel } from "@/lib/payments";
import { getStripe, stripeEnabled } from "@/lib/stripe";

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
  status: "active" | "stopped" | "expired" | "pending";
  paymentLabel: string | null;
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
    paymentLabel: r.payment_label != null ? String(r.payment_label) : null,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const c = await db();
    // abandoned Stripe checkouts: drop pending tickets after 2 h
    await c.execute({
      sql: "DELETE FROM tickets WHERE user_id = ? AND status = 'pending' AND created_at < ?",
      args: [user.id, Date.now() - 2 * 3600_000],
    });
    const res = await c.execute({
      sql: "SELECT * FROM tickets WHERE user_id = ? AND status != 'pending' ORDER BY created_at DESC LIMIT 50",
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
    const paymentMethodId = String(body.paymentMethodId ?? "");
    const minutes = Math.round(Number(body.minutes));
    const zone = body.zone as {
      id?: string; name?: string; lat?: number; lng?: number;
      priceHourCents?: number | null; maxStayMinutes?: number | null;
    } | undefined;

    const useStripe = paymentMethodId === "stripe";
    if (useStripe && !stripeEnabled()) return jsonError("Stripe ist nicht konfiguriert.", 503);

    if (!zone?.id || !zone?.name) return jsonError("Keine Parkzone ausgewählt.", 400, "no_zone");
    if (!vehicleId) return jsonError("Ein Fahrzeug mit Kennzeichen ist für den Kauf erforderlich.", 400, "plate_required");
    if (!paymentMethodId) return jsonError("Bitte wähle eine Zahlungsmethode.", 400, "payment_required");
    if (!isFinite(minutes) || minutes < 15 || minutes > 1440) return jsonError("Parkdauer muss zwischen 15 Minuten und 24 Stunden liegen.", 400, "invalid_duration");
    if (zone.maxStayMinutes != null && minutes > zone.maxStayMinutes) {
      return jsonError(`In dieser Zone sind maximal ${zone.maxStayMinutes} Minuten erlaubt.`, 400, "maxstay", { m: zone.maxStayMinutes });
    }

    const c = await db();
    const veh = await c.execute({
      sql: "SELECT id, plate FROM vehicles WHERE id = ? AND user_id = ?",
      args: [vehicleId, user.id],
    });
    const vrow = veh.rows[0];
    if (!vrow) return jsonError("Fahrzeug nicht gefunden – bitte Kennzeichen anlegen.", 404, "vehicle_not_found");

    let payLabel = "Stripe";
    if (!useStripe) {
      const pm = await c.execute({
        sql: "SELECT * FROM payment_methods WHERE id = ? AND user_id = ?",
        args: [paymentMethodId, user.id],
      });
      const pmRow = pm.rows[0];
      if (!pmRow) return jsonError("Zahlungsmethode nicht gefunden – bitte eine hinzufügen.", 404, "payment_not_found");
      payLabel = paymentLabel(mapPaymentRow(pmRow as unknown as Record<string, unknown>));
    }

    const activeForVehicle = await c.execute({
      sql: "SELECT id FROM tickets WHERE user_id = ? AND vehicle_id = ? AND status = 'active' AND end_at > ?",
      args: [user.id, vehicleId, Date.now()],
    });
    if (activeForVehicle.rows.length > 0) {
      return jsonError("Für dieses Kennzeichen läuft bereits ein Parkschein.", 409, "plate_ticket_exists");
    }

    const priceHourCents = Math.max(0, Math.round(Number(zone.priceHourCents ?? 0)));
    const priceCents = Math.round((priceHourCents * minutes) / 60);
    const now = Date.now();
    const id = newId();

    // real payments: create the ticket as pending and send the user to Stripe
    // Checkout; the webhook activates it once the payment succeeds
    const initialStatus = useStripe && priceCents > 0 ? "pending" : "active";

    await c.execute({
      sql: `INSERT INTO tickets
        (id, user_id, vehicle_id, plate, zone_id, zone_name, zone_lat, zone_lng,
         price_hour_cents, price_cents, currency, start_at, end_at, status, created_at, payment_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?)`,
      args: [
        id, user.id, vehicleId, String(vrow.plate), String(zone.id), String(zone.name),
        zone.lat ?? null, zone.lng ?? null,
        priceHourCents, priceCents, now, now + minutes * 60_000, initialStatus, now, payLabel,
      ],
    });

    if (initialStatus === "pending") {
      const origin = req.nextUrl.origin;
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: priceCents,
              product_data: {
                name: `ParkPilot – ${String(zone.name)}`,
                description: `${String(vrow.plate)} · ${minutes} min`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: { ticketId: id, minutes: String(minutes) },
        success_url: `${origin}/?paid=${id}`,
        cancel_url: `${origin}/?cancelled=1`,
      });
      return NextResponse.json({ checkoutUrl: session.url });
    }

    const res = await c.execute({ sql: "SELECT * FROM tickets WHERE id = ?", args: [id] });
    return NextResponse.json({ ticket: mapRow(res.rows[0] as unknown as Record<string, unknown>) });
  } catch (err) {
    return handleError(err);
  }
}
