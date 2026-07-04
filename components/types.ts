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
  /** set when the zone has no proper name; client shows a localized generic name */
  generic: "street" | "garage" | "underground" | "surface" | "ticket_machine" | null;
};

/** street segments with paid parking (drawn as highlighted streets on the map) */
export type PaidStreet = [number, number][];

export function zoneDisplayName(zone: Zone, t: (k: string) => string): string {
  if (zone.name) return zone.name;
  if (zone.generic === "ticket_machine") return t("generic.ticket_machine");
  return t(`kind.${zone.generic ?? zone.kind}`);
}

export type User = { id: string; email: string; name: string };

export type Vehicle = { id: string; plate: string; label: string | null };

export type PaymentMethod = {
  id: string;
  type: "card" | "paypal" | "googlepay" | "applepay";
  brand: string | null;
  last4: string | null;
  email: string | null;
  isDefault: boolean;
};

export function paymentMethodLabel(m: PaymentMethod): string {
  switch (m.type) {
    case "card": return `${m.brand ?? "Karte"} •••• ${m.last4 ?? "????"}`;
    case "paypal": return `PayPal${m.email ? ` (${m.email})` : ""}`;
    case "googlepay": return "Google Pay";
    case "applepay": return "Apple Pay";
  }
}

export function paymentMethodIcon(m: PaymentMethod): string {
  switch (m.type) {
    case "card": return "💳";
    case "paypal": return "🅿️";
    case "googlepay": return "🇬";
    case "applepay": return "";
  }
}

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
  status: "active" | "stopped" | "expired" | "pending";
  paymentLabel: string | null;
};

export function euro(cents: number | null): string {
  if (cents == null) return "gratis";
  return (cents / 100).toLocaleString("de-AT", { style: "currency", currency: "EUR" });
}

export function fmtDistance(m: number): string {
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

export function zoneColor(zone: Zone): string {
  if (zone.priceHourCents == null || zone.priceHourCents === 0) return "#16a34a";
  if (zone.kind === "garage" || zone.kind === "underground") return "#7c3aed";
  return "#2563eb";
}

export class ApiError extends Error {
  code?: string;
  params?: Record<string, string | number>;
  constructor(message: string, code?: string, params?: Record<string, string | number>) {
    super(message);
    this.code = code;
    this.params = params;
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    params?: Record<string, string | number>;
  };
  if (!res.ok) throw new ApiError(data?.error ?? `Error (${res.status})`, data?.code, data?.params);
  return data;
}
