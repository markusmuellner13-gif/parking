export type ZoneKind = "street" | "surface" | "garage" | "underground";

export type Zone = {
  id: string;
  source: "city" | "osm";
  name: string;
  kind: ZoneKind;
  lat: number;
  lng: number;
  priceHourCents: number | null; // null = free
  currency: "EUR";
  maxStayMinutes: number | null;
  hours: string;
  capacity: number | null;
  operator: string | null;
  estimated: boolean;
  distanceM: number;
};

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

type CityZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priceHourCents: number;
  maxStayMinutes: number | null;
  hours: string;
  radiusM: number;
  verified?: boolean; // tariff confirmed against the city's official 2026 fee schedule
};

/**
 * Curated short-term parking tariff zones for Austrian cities.
 * Tariffs checked against official city sources in July 2026
 * (wien.gv.at, graz.at, linz.at, stadt-salzburg.at, innsbruck.gv.at / local press).
 * Zones without `verified` are flagged "estimated" in the UI — signage is authoritative.
 */
const CITY_ZONES: CityZone[] = [
  // Wien: € 1,70 / 30 min since 2026-01-01 (uniform citywide), max 2 h
  { id: "at-wien-1", name: "Kurzparkzone Wien – Innere Stadt", lat: 48.2082, lng: 16.3738, priceHourCents: 340, maxStayMinutes: 120, hours: "Mo–Fr 09:00–22:00", radiusM: 1500, verified: true },
  { id: "at-wien-2", name: "Kurzparkzone Wien – Leopoldstadt", lat: 48.2167, lng: 16.3907, priceHourCents: 340, maxStayMinutes: 120, hours: "Mo–Fr 09:00–22:00", radiusM: 1800, verified: true },
  { id: "at-wien-6", name: "Kurzparkzone Wien – Mariahilf", lat: 48.1955, lng: 16.3520, priceHourCents: 340, maxStayMinutes: 120, hours: "Mo–Fr 09:00–22:00", radiusM: 1400, verified: true },
  { id: "at-wien-9", name: "Kurzparkzone Wien – Alsergrund", lat: 48.2246, lng: 16.3574, priceHourCents: 340, maxStayMinutes: 120, hours: "Mo–Fr 09:00–22:00", radiusM: 1400, verified: true },
  { id: "at-wien-10", name: "Kurzparkzone Wien – Favoriten", lat: 48.1740, lng: 16.3796, priceHourCents: 340, maxStayMinutes: 120, hours: "Mo–Fr 09:00–22:00", radiusM: 2200, verified: true },
  // Graz: blau € 1,30 / 30 min, grün € 1,00 / 30 min
  { id: "at-graz-blau", name: "Blaue Zone Graz – Zentrum", lat: 47.0707, lng: 15.4395, priceHourCents: 260, maxStayMinutes: 180, hours: "Mo–Fr 09:00–20:00", radiusM: 1500, verified: true },
  { id: "at-graz-gruen", name: "Grüne Zone Graz (Langparkzone)", lat: 47.0790, lng: 15.4210, priceHourCents: 200, maxStayMinutes: null, hours: "Mo–Fr 09:00–20:00", radiusM: 2500, verified: true },
  // Linz: € 1,00 / 30 min, max 90 min im Zentrum
  { id: "at-linz-kpz", name: "Kurzparkzone Linz – Zentrum", lat: 48.3059, lng: 14.2862, priceHourCents: 200, maxStayMinutes: 90, hours: "Mo–Fr 08:00–18:30, Sa 08:00–12:00", radiusM: 1500, verified: true },
  // Salzburg: seit 2026 erhöht (~€ 2,33/h laut Stadt), max 3 h
  { id: "at-salzburg-kpz", name: "Kurzparkzone Salzburg – Altstadt", lat: 47.7995, lng: 13.0455, priceHourCents: 233, maxStayMinutes: 180, hours: "Mo–Fr 09:00–19:00", radiusM: 1500 },
  // Innsbruck: € 1,10 / 30 min, Altstadt max 90 min (seit 2025-04-22)
  { id: "at-innsbruck-kpz", name: "Kurzparkzone Innsbruck – Altstadt", lat: 47.2654, lng: 11.3928, priceHourCents: 220, maxStayMinutes: 90, hours: "Mo–Sa 09:00–19:00", radiusM: 1200, verified: true },
  { id: "at-innsbruck-180", name: "Kurzparkzone Innsbruck – erweitertes Zentrum", lat: 47.2610, lng: 11.4010, priceHourCents: 220, maxStayMinutes: 180, hours: "Mo–Sa 09:00–19:00", radiusM: 2000, verified: true },
];

export function cityZonesNear(lat: number, lng: number, radiusM: number): Zone[] {
  return CITY_ZONES.flatMap((z) => {
    const d = haversineM(lat, lng, z.lat, z.lng);
    if (d > radiusM + z.radiusM) return [];
    const inside = d <= z.radiusM;
    return [
      {
        id: z.id,
        source: "city" as const,
        name: z.name,
        kind: "street" as const,
        lat: z.lat,
        lng: z.lng,
        priceHourCents: z.priceHourCents,
        currency: "EUR" as const,
        maxStayMinutes: z.maxStayMinutes,
        hours: z.hours,
        capacity: null,
        operator: "Stadt / Gemeinde",
        estimated: !z.verified,
        distanceM: inside ? 0 : d - z.radiusM,
      },
    ];
  });
}

/** Parse an OSM "charge" tag like "1.50 EUR/hour", "€2/1 hour", "2.60" */
export function parseChargeToHourlyCents(charge: string | undefined): number | null {
  if (!charge) return null;
  const m = charge.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let value = parseFloat(m[1]);
  const lower = charge.toLowerCase();
  if (/(30\s*min|half)/.test(lower)) value *= 2;
  else if (/(15\s*min|quarter)/.test(lower)) value *= 4;
  else if (/day|tag|24/.test(lower)) value /= 10;
  if (!isFinite(value) || value <= 0 || value > 80) return null;
  return Math.round(value * 100);
}

/** Parse an OSM "maxstay" tag like "2 hours", "90 min", "2:00" */
export function parseMaxStayMinutes(maxstay: string | undefined): number | null {
  if (!maxstay || /^no(ne)?$/i.test(maxstay)) return null;
  const lower = maxstay.toLowerCase().replace(",", ".");
  const num = lower.match(/(\d+(?:\.\d+)?)/);
  if (!num) return null;
  const v = parseFloat(num[1]);
  if (/min/.test(lower)) return Math.round(v);
  if (/h|hour|stunde/.test(lower)) return Math.round(v * 60);
  if (/day|tag/.test(lower)) return Math.round(v * 1440);
  return Math.round(v * 60);
}
