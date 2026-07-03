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
  /** visual extent on the map: circle radius for tariff zones … */
  areaRadiusM: number | null;
  /** … or real outline for OSM parking areas */
  polygon: [number, number][] | null;
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
  // Baden bei Wien: € 1,00 / 30 min (baden.at), max 2 h
  { id: "at-baden-blau", name: "Blaue Zone Baden bei Wien – Zentrum", lat: 48.0075, lng: 16.2344, priceHourCents: 200, maxStayMinutes: 120, hours: "Mo–Fr 08:00–12:00 & 13:30–18:00, Sa 08:00–12:00", radiusM: 1000, verified: true },
  // weitere Landeshauptstädte & Kleinstädte (Richtwerte)
  { id: "at-stpoelten-kpz", name: "Kurzparkzone St. Pölten – Zentrum", lat: 48.2036, lng: 15.6267, priceHourCents: 200, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1200 },
  { id: "at-wrneustadt-kpz", name: "Kurzparkzone Wiener Neustadt – Zentrum", lat: 47.8139, lng: 16.2434, priceHourCents: 150, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1100 },
  { id: "at-klagenfurt-kpz", name: "Kurzparkzone Klagenfurt – Zentrum", lat: 46.6247, lng: 14.3050, priceHourCents: 220, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–13:00", radiusM: 1300 },
  { id: "at-villach-kpz", name: "Kurzparkzone Villach – Zentrum", lat: 46.6111, lng: 13.8558, priceHourCents: 150, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1000 },
  { id: "at-wels-kpz", name: "Kurzparkzone Wels – Zentrum", lat: 48.1575, lng: 14.0289, priceHourCents: 150, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1000 },
  { id: "at-steyr-kpz", name: "Kurzparkzone Steyr – Zentrum", lat: 48.0421, lng: 14.4213, priceHourCents: 140, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 900 },
  { id: "at-bregenz-kpz", name: "Kurzparkzone Bregenz – Zentrum", lat: 47.5031, lng: 9.7471, priceHourCents: 190, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1000 },
  { id: "at-dornbirn-kpz", name: "Kurzparkzone Dornbirn – Zentrum", lat: 47.4125, lng: 9.7417, priceHourCents: 160, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1000 },
  { id: "at-eisenstadt-kpz", name: "Kurzparkzone Eisenstadt – Zentrum", lat: 47.8456, lng: 16.5253, priceHourCents: 130, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 900 },
  { id: "at-krems-kpz", name: "Kurzparkzone Krems – Zentrum", lat: 48.4102, lng: 15.6144, priceHourCents: 160, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 1000 },
  { id: "at-moedling-kpz", name: "Kurzparkzone Mödling – Zentrum", lat: 48.0856, lng: 16.2831, priceHourCents: 200, maxStayMinutes: 180, hours: "Mo–Fr 08:00–18:00, Sa 08:00–12:00", radiusM: 900 },
  // Italia – strisce blu (tariffe indicative, fa fede la segnaletica)
  { id: "it-roma-blu", name: "Strisce Blu Roma – Centro Storico", lat: 41.9028, lng: 12.4964, priceHourCents: 150, maxStayMinutes: null, hours: "Lun–Sab 08:00–20:00", radiusM: 2500 },
  { id: "it-milano-blu", name: "Sosta Blu Milano – Cerchia dei Bastioni", lat: 45.4642, lng: 9.1900, priceHourCents: 300, maxStayMinutes: 120, hours: "Lun–Ven 08:00–19:00", radiusM: 2000 },
  { id: "it-torino-blu", name: "Strisce Blu Torino – Centro", lat: 45.0703, lng: 7.6869, priceHourCents: 170, maxStayMinutes: null, hours: "Lun–Ven 08:00–19:30", radiusM: 1800 },
  { id: "it-bologna-blu", name: "Strisce Blu Bologna – Centro", lat: 44.4949, lng: 11.3426, priceHourCents: 240, maxStayMinutes: null, hours: "Lun–Dom 08:00–20:00", radiusM: 1500 },
  { id: "it-firenze-blu", name: "Strisce Blu Firenze – Centro", lat: 43.7696, lng: 11.2558, priceHourCents: 200, maxStayMinutes: null, hours: "Lun–Sab 08:00–20:00", radiusM: 1500 },
  { id: "it-verona-blu", name: "Strisce Blu Verona – Centro", lat: 45.4384, lng: 10.9916, priceHourCents: 200, maxStayMinutes: 120, hours: "Lun–Sab 08:00–20:00", radiusM: 1200 },
  { id: "it-bolzano-blu", name: "Zona Blu Bolzano / Bozen – Centro", lat: 46.4983, lng: 11.3548, priceHourCents: 220, maxStayMinutes: 180, hours: "Lun–Ven 08:00–19:00, Sa 08:00–13:00", radiusM: 1200 },
  { id: "it-trieste-blu", name: "Strisce Blu Trieste – Centro", lat: 45.6495, lng: 13.7768, priceHourCents: 150, maxStayMinutes: null, hours: "Lun–Sab 08:00–19:00", radiusM: 1200 },
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
        areaRadiusM: z.radiusM,
        polygon: null,
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
