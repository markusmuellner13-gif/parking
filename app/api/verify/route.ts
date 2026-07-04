import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePlate } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Enforcement lookup: does this plate have a valid digital parking ticket
 * right now? Public and privacy-preserving – it returns only ticket validity
 * (zone, valid-until), never any account or personal data. This mirrors how
 * enforcement whitelists work; a real municipal rollout would replace or feed
 * this via the operator's back office.
 */
export async function GET(req: NextRequest) {
  try {
    const raw = new URL(req.url).searchParams.get("plate") ?? "";
    const plate = normalizePlate(raw);
    if (!plate) return jsonError("Ungültiges Kennzeichen (2–12 Zeichen, Buchstaben/Ziffern).", 400, "invalid_plate");

    const c = await db();
    const res = await c.execute({
      sql: `SELECT zone_name, start_at, end_at FROM tickets
            WHERE plate = ? AND status = 'active' AND end_at > ?
            ORDER BY end_at DESC LIMIT 5`,
      args: [plate, Date.now()],
    });

    return NextResponse.json({
      plate,
      valid: res.rows.length > 0,
      checkedAt: Date.now(),
      tickets: res.rows.map((r) => ({
        zoneName: String(r.zone_name),
        validFrom: Number(r.start_at),
        validUntil: Number(r.end_at),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
