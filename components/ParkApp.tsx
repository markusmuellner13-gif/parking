"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  api, euro, fmtDistance, fmtDuration, kindLabel, zoneColor,
  type Ticket, type User, type Vehicle, type Zone,
} from "./types";
import AuthSheet from "./AuthSheet";
import ParkSheet from "./ParkSheet";
import AccountSheet from "./AccountSheet";
import ActiveTicketBar from "./ActiveTicketBar";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-500">
      Karte wird geladen…
    </div>
  ),
});

const FALLBACK: [number, number] = [48.2082, 16.3738]; // Wien, Stephansplatz
const REFETCH_DISTANCE_M = 500;

function distM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function ParkApp() {
  const [user, setUser] = useState<User | null>(null);
  const [persistentDb, setPersistentDb] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoStatus, setGeoStatus] = useState<"pending" | "ok" | "denied">("pending");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sheet, setSheet] = useState<"none" | "auth" | "park" | "account">("none");
  const [toast, setToast] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);

  const searchCenterRef = useRef<[number, number] | null>(null);
  const mapCenterRef = useRef<[number, number]>(FALLBACK);
  const parkIntentRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchZones = useCallback(async (lat: number, lng: number) => {
    setZonesLoading(true);
    setShowSearchHere(false);
    searchCenterRef.current = [lat, lng];
    try {
      const data = await api<{ zones: Zone[] }>(`/api/zones?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&radius=1200`);
      setZones(data.zones);
    } catch {
      showToast("Parkzonen konnten nicht geladen werden.");
    } finally {
      setZonesLoading(false);
    }
  }, [showToast]);

  const refreshTickets = useCallback(async () => {
    try {
      const data = await api<{ tickets: Ticket[] }>("/api/tickets");
      setTickets(data.tickets);
    } catch {
      /* not logged in */
    }
  }, []);

  const refreshVehicles = useCallback(async () => {
    try {
      const data = await api<{ vehicles: Vehicle[] }>("/api/vehicles");
      setVehicles(data.vehicles);
    } catch {
      /* not logged in */
    }
  }, []);

  // initial: session + geolocation
  useEffect(() => {
    api<{ user: User | null; persistentDb: boolean }>("/api/auth/me")
      .then((d) => {
        setUser(d.user);
        setPersistentDb(d.persistentDb);
        if (d.user) {
          refreshTickets();
          refreshVehicles();
        }
      })
      .catch(() => {});

    if (!("geolocation" in navigator)) {
      setGeoStatus("denied");
      fetchZones(...FALLBACK);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setUserPos(pos);
        setGeoStatus("ok");
        if (!searchCenterRef.current) {
          setFlyTo({ lat: pos[0], lng: pos[1], nonce: Date.now() });
          fetchZones(pos[0], pos[1]);
        }
      },
      () => {
        setGeoStatus((s) => (s === "ok" ? s : "denied"));
        if (!searchCenterRef.current) fetchZones(...FALLBACK);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [fetchZones, refreshTickets, refreshVehicles]);

  const onMapMoved = useCallback((lat: number, lng: number) => {
    mapCenterRef.current = [lat, lng];
    const sc = searchCenterRef.current;
    setShowSearchHere(!!sc && distM(sc, [lat, lng]) > REFETCH_DISTANCE_M);
  }, []);

  const selectZone = useCallback((zone: Zone | null, fly = false) => {
    setSelected(zone);
    if (zone && fly) setFlyTo({ lat: zone.lat, lng: zone.lng, nonce: Date.now() });
  }, []);

  const startParking = useCallback(() => {
    if (!selected) return;
    if (!user) {
      parkIntentRef.current = true;
      setSheet("auth");
      return;
    }
    setSheet("park");
  }, [selected, user]);

  const onAuthed = useCallback((u: User) => {
    setUser(u);
    refreshTickets();
    refreshVehicles();
    if (parkIntentRef.current) {
      parkIntentRef.current = false;
      setSheet("park");
    } else {
      setSheet("none");
    }
  }, [refreshTickets, refreshVehicles]);

  const onTicketBought = useCallback((t: Ticket) => {
    setSheet("none");
    setSelected(null);
    setTickets((prev) => [t, ...prev]);
    showToast(`Parkschein aktiv für ${t.plate} – gute Fahrt! 🅿️`);
  }, [showToast]);

  const activeTickets = useMemo(
    () => tickets.filter((t) => t.status === "active" && t.stoppedAt == null && t.endAt > Date.now()),
    [tickets]
  );

  const locate = useCallback(() => {
    if (userPos) {
      setFlyTo({ lat: userPos[0], lng: userPos[1], nonce: Date.now() });
      fetchZones(userPos[0], userPos[1]);
    } else {
      showToast("Standort nicht verfügbar – bitte Ortungsdienste erlauben.");
    }
  }, [userPos, fetchZones, showToast]);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden md:flex-row">
      {/* ===== Desktop sidebar / mobile overlays share components ===== */}
      <aside className="z-20 hidden w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Header user={user} onAccount={() => setSheet(user ? "account" : "auth")} />
        {!persistentDb && <DemoBanner />}
        <ActiveTicketBar tickets={activeTickets} onChanged={refreshTickets} />
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <ZoneDetail zone={selected} onBack={() => selectZone(null)} onPark={startParking} />
          ) : (
            <ZoneList
              zones={zones}
              loading={zonesLoading}
              geoDenied={geoStatus === "denied"}
              onSelect={(z) => selectZone(z, true)}
            />
          )}
        </div>
      </aside>

      {/* ===== Map ===== */}
      <main className="relative min-h-0 flex-1">
        <MapView
          center={userPos ?? FALLBACK}
          userPos={userPos}
          zones={zones}
          selectedId={selected?.id ?? null}
          onSelect={(z) => selectZone(z)}
          onMoved={onMapMoved}
          flyTo={flyTo}
        />

        {/* mobile header */}
        <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[calc(var(--safe-top)+0.5rem)] md:hidden">
          <Header user={user} onAccount={() => setSheet(user ? "account" : "auth")} floating />
          {!persistentDb && <DemoBanner floating />}
          <ActiveTicketBar tickets={activeTickets} onChanged={refreshTickets} floating />
        </div>

        {/* search-this-area */}
        {showSearchHere && (
          <button
            onClick={() => fetchZones(...mapCenterRef.current)}
            className="absolute left-1/2 top-[calc(var(--safe-top)+4.2rem)] z-20 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg active:scale-95 md:top-6"
          >
            {zonesLoading ? "Suche…" : "🔍 Diesen Bereich absuchen"}
          </button>
        )}

        {/* locate button */}
        <button
          onClick={locate}
          aria-label="Meinen Standort anzeigen"
          className="absolute bottom-[max(11.5rem,calc(var(--safe-bottom)+11.5rem))] right-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-lg ring-1 ring-slate-200 active:scale-95 md:bottom-8 md:right-6"
        >
          🎯
        </button>

        {/* mobile: horizontal zone cards OR detail sheet */}
        <div className="absolute inset-x-0 bottom-0 z-20 pb-[max(0.75rem,var(--safe-bottom))] md:hidden">
          {selected ? (
            <div className="pp-sheet mx-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
              <ZoneDetail zone={selected} onBack={() => selectZone(null)} onPark={startParking} compact />
            </div>
          ) : (
            <>
              {geoStatus === "denied" && (
                <p className="mx-3 mb-2 rounded-xl bg-white/95 px-3 py-2 text-center text-[11px] text-blue-900 shadow ring-1 ring-blue-200">
                  📍 Standort nicht freigegeben – erlaube die Ortung in den Browser-Einstellungen, damit ParkPilot dich auf der Karte zeigt.
                </p>
              )}
              <MobileZoneCards zones={zones} loading={zonesLoading} onSelect={(z) => selectZone(z, true)} />
            </>
          )}
        </div>
      </main>

      {/* ===== Sheets / dialogs ===== */}
      {sheet === "auth" && (
        <AuthSheet onClose={() => setSheet("none")} onAuthed={onAuthed} />
      )}
      {sheet === "park" && selected && user && (
        <ParkSheet
          zone={selected}
          vehicles={vehicles}
          onVehiclesChanged={refreshVehicles}
          onClose={() => setSheet("none")}
          onBought={onTicketBought}
        />
      )}
      {sheet === "account" && user && (
        <AccountSheet
          user={user}
          vehicles={vehicles}
          tickets={tickets}
          persistentDb={persistentDb}
          onVehiclesChanged={refreshVehicles}
          onClose={() => setSheet("none")}
          onLogout={() => {
            setUser(null);
            setVehicles([]);
            setTickets([]);
            setSheet("none");
          }}
        />
      )}

      {toast && (
        <div className="pp-sheet absolute inset-x-0 top-[calc(var(--safe-top)+4rem)] z-50 mx-auto w-fit max-w-[90%] rounded-full bg-slate-900/95 px-5 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- header ---------- */

function Header({ user, onAccount, floating }: { user: User | null; onAccount: () => void; floating?: boolean }) {
  return (
    <div
      className={
        floating
          ? "flex items-center justify-between rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-slate-200 backdrop-blur"
          : "flex items-center justify-between border-b border-slate-200 px-4 py-3"
      }
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-lg font-black text-white shadow-sm">
          P
        </span>
        <div className="leading-tight">
          <div className="text-base font-extrabold tracking-tight text-slate-900">ParkPilot</div>
          <div className="text-[11px] text-slate-500">Dein Park-Copilot</div>
        </div>
      </div>
      <button
        onClick={onAccount}
        className="flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-3 pr-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 active:scale-95"
      >
        {user ? user.name.split(" ")[0] : "Anmelden"}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
          {user ? user.name[0]?.toUpperCase() : "👤"}
        </span>
      </button>
    </div>
  );
}

function DemoBanner({ floating }: { floating?: boolean }) {
  return (
    <div
      className={`${floating ? "mt-2 rounded-xl shadow" : ""} bg-amber-100 px-3 py-1.5 text-center text-[11px] font-medium text-amber-900`}
    >
      ⚠️ Demo-Speicher aktiv – Turso-Datenbank noch nicht verbunden, Konten können zurückgesetzt werden.
    </div>
  );
}

/* ---------- zone list (desktop sidebar) ---------- */

function ZoneList({
  zones, loading, geoDenied, onSelect,
}: { zones: Zone[]; loading: boolean; geoDenied: boolean; onSelect: (z: Zone) => void }) {
  return (
    <div className="p-3">
      {geoDenied && (
        <p className="mb-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
          📍 Standort nicht freigegeben – es wird Wien angezeigt. Erlaube die Ortung für Zonen in deiner Nähe.
        </p>
      )}
      <h2 className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {loading ? "Parkzonen werden gesucht…" : `${zones.length} Parkzonen in der Nähe`}
      </h2>
      {!loading && zones.length === 0 && (
        <p className="px-1 text-sm text-slate-500">
          Keine Zonen gefunden. Verschiebe die Karte und tippe auf „Diesen Bereich absuchen“.
        </p>
      )}
      <ul className="space-y-2">
        {zones.map((z) => (
          <li key={z.id}>
            <button
              onClick={() => onSelect(z)}
              className="w-full rounded-xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 transition hover:bg-blue-50 hover:ring-blue-300"
            >
              <ZoneRow zone={z} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZoneRow({ zone }: { zone: Zone }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white"
        style={{ background: zoneColor(zone) }}
      >
        {zone.kind === "garage" || zone.kind === "underground" ? "G" : "P"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{zone.name}</div>
        <div className="truncate text-xs text-slate-500">
          {kindLabel(zone.kind)} · {fmtDistance(zone.distanceM)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-slate-900">
          {zone.priceHourCents == null ? "gratis" : `${euro(zone.priceHourCents)}/h`}
        </div>
        {zone.estimated && zone.priceHourCents != null && (
          <div className="text-[10px] text-slate-400">geschätzt</div>
        )}
      </div>
    </div>
  );
}

/* ---------- mobile horizontal cards ---------- */

function MobileZoneCards({
  zones, loading, onSelect,
}: { zones: Zone[]; loading: boolean; onSelect: (z: Zone) => void }) {
  if (loading) {
    return (
      <div className="mx-3 rounded-2xl bg-white/95 p-4 text-center text-sm text-slate-500 shadow-xl ring-1 ring-slate-200">
        🛰️ Parkzonen werden gesucht…
      </div>
    );
  }
  if (zones.length === 0) {
    return (
      <div className="mx-3 rounded-2xl bg-white/95 p-4 text-center text-sm text-slate-500 shadow-xl ring-1 ring-slate-200">
        Keine Parkzonen gefunden – verschiebe die Karte und suche erneut.
      </div>
    );
  }
  return (
    <div className="pp-scroll-x flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3">
      {zones.slice(0, 25).map((z) => (
        <button
          key={z.id}
          onClick={() => onSelect(z)}
          className="w-[78vw] max-w-xs shrink-0 snap-center rounded-2xl bg-white/95 p-3.5 text-left shadow-xl ring-1 ring-slate-200 backdrop-blur active:scale-[0.98]"
        >
          <ZoneRow zone={z} />
        </button>
      ))}
    </div>
  );
}

/* ---------- zone detail ---------- */

function ZoneDetail({
  zone, onBack, onPark, compact,
}: { zone: Zone; onBack: () => void; onPark: () => void; compact?: boolean }) {
  const free = zone.priceHourCents == null || zone.priceHourCents === 0;
  return (
    <div className={compact ? "" : "p-4"}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white"
          style={{ background: zoneColor(zone) }}
        >
          {zone.kind === "garage" || zone.kind === "underground" ? "G" : "P"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-slate-900">{zone.name}</h3>
          <p className="text-xs text-slate-500">
            {kindLabel(zone.kind)} · {zone.distanceM < 25 ? "direkt bei dir" : `${fmtDistance(zone.distanceM)} entfernt`}
            {zone.operator ? ` · ${zone.operator}` : ""}
          </p>
        </div>
        <button onClick={onBack} aria-label="Schließen" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-500 active:scale-95">
          ✕
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tarif</dt>
          <dd className="text-sm font-bold text-slate-900">
            {free ? "gratis" : `${euro(zone.priceHourCents)}/h`}
            {zone.estimated && !free && <span className="block text-[10px] font-normal text-slate-400">geschätzt*</span>}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Max. Dauer</dt>
          <dd className="text-sm font-bold text-slate-900">
            {zone.maxStayMinutes ? fmtDuration(zone.maxStayMinutes) : "unbegrenzt"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {zone.capacity ? "Plätze" : "Quelle"}
          </dt>
          <dd className="text-sm font-bold text-slate-900">
            {zone.capacity ?? (zone.source === "osm" ? "OpenStreetMap" : "Stadt-Tarif")}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-xs text-slate-500">🕐 Gebührenpflichtig: {zone.hours}</p>
      {zone.estimated && !free && (
        <p className="mt-1 text-[11px] text-slate-400">* Richtwert – maßgeblich ist die Beschilderung vor Ort.</p>
      )}

      <button
        onClick={onPark}
        className="mt-3 w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.98]"
      >
        {free ? "Parkvorgang starten (gratis)" : "Parkschein lösen"}
      </button>
    </div>
  );
}
