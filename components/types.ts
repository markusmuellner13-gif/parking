export type ZoneKind = "street" | "surface" | "garage" | "underground";

export type Zone = {
  id: string;
  source: "city" | "osm";
  name: string;
  kind: ZoneKind;
  lat: number;
  lng: number;
  priceHourCents: number | null;
  currency: "EUR";
  maxStayMinutes: number | null;
  hours: string;
  capacity: number | null;
  operator: string | null;
  estimated: boolean;
  distanceM: number;
  areaRadiusM: number | null;
  polygon: [number, number][] | null;
};

export type User = { id: string; email: string; name: string };

export type Vehicle = { id: string; plate: string; label: string | null };

export type Ticket = {
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

export function euro(cents: number | null): string {
  if (cents == null) return "gratis";
  return (cents / 100).toLocaleString("de-AT", { style: "currency", currency: "EUR" });
}

export function fmtDistance(m: number): string {
  if (m < 25) return "hier";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function kindLabel(kind: ZoneKind): string {
  switch (kind) {
    case "street": return "Straßenparken";
    case "garage": return "Parkhaus";
    case "underground": return "Tiefgarage";
    default: return "Parkplatz";
  }
}

export function zoneColor(zone: Zone): string {
  if (zone.priceHourCents == null || zone.priceHourCents === 0) return "#16a34a";
  if (zone.kind === "garage" || zone.kind === "underground") return "#7c3aed";
  return "#2563eb";
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error ?? `Fehler (${res.status})`);
  return data;
}
