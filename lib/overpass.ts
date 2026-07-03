import { db } from "./db";
import {
  haversineM,
  parseChargeToHourlyCents,
  parseMaxStayMinutes,
  type Zone,
  type ZoneKind,
} from "./zones";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type OsmElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function cacheKey(lat: number, lng: number, radiusM: number): string {
  // ~1.1 km snapping grid so nearby requests share a cache entry
  return `ovp:${Math.round(lat * 100)}:${Math.round(lng * 100)}:${radiusM}`;
}

async function fetchOverpass(lat: number, lng: number, radiusM: number): Promise<OsmElement[]> {
  const query = `[out:json][timeout:14];
(
  node["amenity"="parking"](around:${radiusM},${lat},${lng});
  way["amenity"="parking"](around:${radiusM},${lat},${lng});
  node["vending"="parking_tickets"](around:${radiusM},${lat},${lng});
);
out center 80;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Overpass usage policy requires an identifying User-Agent; anonymous requests get 403
          "User-Agent": "ParkPilot/1.0 (parking zone finder PWA; https://parking-rosy-sigma.vercel.app)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch {
      // try next endpoint
    }
  }
  return [];
}

function kindOf(tags: Record<string, string>): ZoneKind {
  const p = tags.parking;
  if (p === "multi-storey") return "garage";
  if (p === "underground") return "underground";
  if (p === "street_side" || p === "lane" || p === "on_street") return "street";
  return "surface";
}

function nameOf(tags: Record<string, string>, kind: ZoneKind): string {
  if (tags.name) return tags.name;
  if (tags.vending === "parking_tickets") return "Straßenparken (Parkscheinautomat)";
  switch (kind) {
    case "garage": return "Parkhaus";
    case "underground": return "Tiefgarage";
    case "street": return "Straßenparken";
    default: return "Parkplatz";
  }
}

const DEFAULT_HOURLY: Record<ZoneKind, number> = {
  street: 200,
  surface: 150,
  garage: 260,
  underground: 280,
};

function toZone(el: OsmElement, userLat: number, userLng: number): Zone | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const tags = el.tags ?? {};
  if (tags.access === "private" || tags.access === "no") return null;

  const isTicketMachine = tags.vending === "parking_tickets";
  const kind: ZoneKind = isTicketMachine ? "street" : kindOf(tags);

  const parsedCharge = parseChargeToHourlyCents(tags.charge ?? tags["charge:conditional"]);
  const feeTag = tags.fee;
  let priceHourCents: number | null;
  let estimated = true;
  if (parsedCharge != null) {
    priceHourCents = parsedCharge;
    estimated = false;
  } else if (feeTag === "no") {
    priceHourCents = null;
    estimated = false;
  } else if (feeTag === "yes" || isTicketMachine || kind === "garage" || kind === "underground") {
    priceHourCents = DEFAULT_HOURLY[kind];
  } else {
    priceHourCents = null; // unknown fee on plain lots -> treat as free/unknown
  }

  return {
    id: `osm-${el.type}-${el.id}`,
    source: "osm",
    name: nameOf(tags, kind),
    kind,
    lat,
    lng,
    priceHourCents,
    currency: "EUR",
    maxStayMinutes: parseMaxStayMinutes(tags.maxstay),
    hours: tags.opening_hours ?? "24/7 (unbestätigt)",
    capacity: tags.capacity ? parseInt(tags.capacity, 10) || null : null,
    operator: tags.operator ?? null,
    estimated,
    distanceM: haversineM(userLat, userLng, lat, lng),
  };
}

export async function osmZonesNear(lat: number, lng: number, radiusM: number): Promise<Zone[]> {
  const key = cacheKey(lat, lng, radiusM);
  let elements: OsmElement[] | null = null;

  try {
    const c = await db();
    const cached = await c.execute({
      sql: "SELECT payload, fetched_at FROM overpass_cache WHERE cache_key = ?",
      args: [key],
    });
    const row = cached.rows[0];
    if (row && Date.now() - Number(row.fetched_at) < CACHE_TTL_MS) {
      elements = JSON.parse(String(row.payload)) as OsmElement[];
    }
  } catch {
    // cache is best-effort
  }

  if (!elements) {
    elements = await fetchOverpass(lat, lng, radiusM);
    if (elements.length > 0) {
      try {
        const c = await db();
        await c.execute({
          sql: "INSERT OR REPLACE INTO overpass_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)",
          args: [key, JSON.stringify(elements), Date.now()],
        });
      } catch {
        // cache is best-effort
      }
    }
  }

  const zones = elements
    .map((el) => toZone(el, lat, lng))
    .filter((z): z is Zone => z !== null);
  zones.sort((a, b) => a.distanceM - b.distanceM);
  return zones.slice(0, 60);
}
