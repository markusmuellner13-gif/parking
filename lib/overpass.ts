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
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};

function cacheKey(lat: number, lng: number, radiusM: number): string {
  // ~1.1 km snapping grid so nearby requests share a cache entry
  // (v3: bumped when paid-street ways were added to the query)
  return `ovp3:${Math.round(lat * 100)}:${Math.round(lng * 100)}:${radiusM}`;
}

async function fetchOverpass(lat: number, lng: number, radiusM: number): Promise<OsmElement[]> {
  const around = `(around:${radiusM},${lat},${lng})`;
  // parking places + ticket machines, then streets tagged with paid parking
  // (both the modern parking:*:fee scheme and the older parking:condition scheme)
  const query = `[out:json][timeout:20];
(
  node["amenity"="parking"]${around};
  way["amenity"="parking"]${around};
  node["vending"="parking_tickets"]${around};
);
out geom 80;
(
  way["highway"]["parking:condition:both"~"ticket|disc"]${around};
  way["highway"]["parking:condition:left"~"ticket|disc"]${around};
  way["highway"]["parking:condition:right"~"ticket|disc"]${around};
  way["highway"]["parking:both:fee"~"yes"]${around};
  way["highway"]["parking:left:fee"~"yes"]${around};
  way["highway"]["parking:right:fee"~"yes"]${around};
);
out geom 350;`;

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

function isPaidStreetWay(el: OsmElement): boolean {
  return el.type === "way" && el.tags?.highway != null;
}

const DEFAULT_HOURLY: Record<ZoneKind, number> = {
  street: 200,
  surface: 150,
  garage: 260,
  underground: 280,
};

/** Downsample a way outline to at most `max` points to keep responses small. */
function simplify(points: { lat: number; lon: number }[], max = 32): [number, number][] {
  const step = Math.max(1, Math.ceil(points.length / max));
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i += step) out.push([points[i].lat, points[i].lon]);
  return out;
}

function toZone(el: OsmElement, userLat: number, userLng: number): Zone | null {
  let lat = el.lat ?? el.center?.lat;
  let lng = el.lon ?? el.center?.lon;
  let polygon: [number, number][] | null = null;
  if (el.geometry && el.geometry.length >= 3) {
    polygon = simplify(el.geometry);
    if (lat == null || lng == null) {
      lat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
      lng = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
    }
  }
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
    name: tags.name ?? "",
    kind,
    lat,
    lng,
    priceHourCents,
    currency: "EUR",
    maxStayMinutes: parseMaxStayMinutes(tags.maxstay),
    hours: tags.opening_hours ?? "",
    capacity: tags.capacity ? parseInt(tags.capacity, 10) || null : null,
    operator: tags.operator ?? null,
    estimated,
    distanceM: haversineM(userLat, userLng, lat, lng),
    areaRadiusM: null,
    polygon,
    generic: tags.name ? null : isTicketMachine ? "ticket_machine" : kind,
  };
}

export type OsmResult = { zones: Zone[]; paidStreets: [number, number][][] };

export async function osmZonesNear(lat: number, lng: number, radiusM: number): Promise<OsmResult> {
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
    .filter((el) => !isPaidStreetWay(el))
    .map((el) => toZone(el, lat, lng))
    .filter((z): z is Zone => z !== null);
  zones.sort((a, b) => a.distanceM - b.distanceM);

  // streets with paid parking, drawn as highlighted polylines on the map
  const paidStreets: [number, number][][] = [];
  for (const el of elements) {
    if (!isPaidStreetWay(el) || !el.geometry || el.geometry.length < 2) continue;
    paidStreets.push(simplify(el.geometry, 24));
    if (paidStreets.length >= 350) break;
  }

  return { zones: zones.slice(0, 60), paidStreets };
}
