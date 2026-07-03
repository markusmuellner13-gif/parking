import { NextRequest, NextResponse } from "next/server";
import { cityZonesNear, type Zone } from "@/lib/zones";
import { osmZonesNear } from "@/lib/overpass";
import { jsonError, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const lat = parseFloat(params.get("lat") ?? "");
    const lng = parseFloat(params.get("lng") ?? "");
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return jsonError("Ungültige Koordinaten.");
    }
    const radiusM = Math.min(Math.max(parseInt(params.get("radius") ?? "1200", 10) || 1200, 300), 3000);

    const [city, osm] = await Promise.all([
      Promise.resolve(cityZonesNear(lat, lng, radiusM)),
      osmZonesNear(lat, lng, radiusM),
    ]);

    const zones: Zone[] = [...city, ...osm.zones].sort((a, b) => a.distanceM - b.distanceM);
    return NextResponse.json({ zones, paidStreets: osm.paidStreets, radiusM });
  } catch (err) {
    return handleError(err);
  }
}
