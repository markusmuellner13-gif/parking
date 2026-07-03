"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { api, euro, fmtDuration, type Ticket, type User, type Vehicle } from "./types";

export default function AccountSheet({
  user, vehicles, tickets, persistentDb, onVehiclesChanged, onClose, onLogout,
}: {
  user: User;
  vehicles: Vehicle[];
  tickets: Ticket[];
  persistentDb: boolean;
  onVehiclesChanged: () => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({ plate: newPlate, label: newLabel }),
      });
      setNewPlate("");
      setNewLabel("");
      onVehiclesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(id: string) {
    setError(null);
    try {
      await api(`/api/vehicles?id=${id}`, { method: "DELETE" });
      onVehiclesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  return (
    <Sheet title="Mein Konto" onClose={onClose}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-700 text-lg font-bold text-white">
          {user.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-slate-900">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
        </div>
        <button onClick={logout} className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 active:scale-95">
          Abmelden
        </button>
      </div>

      {!persistentDb && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          ⚠️ Demo-Speicher: Die Turso-Datenbank ist noch nicht verbunden (Env-Variablen fehlen). Konten &amp; Tickets
          können bei einem Neustart verloren gehen.
        </p>
      )}

      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Meine Fahrzeuge</h3>
      <div className="space-y-2">
        {vehicles.length === 0 && (
          <p className="text-sm text-slate-500">Noch kein Fahrzeug – lege dein Kennzeichen an, um Parkscheine kaufen zu können.</p>
        )}
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="rounded-md border border-slate-400 px-2 py-0.5 font-mono text-sm font-bold tracking-widest">{v.plate}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{v.label ?? ""}</span>
            <button onClick={() => removeVehicle(v.id)} aria-label={`${v.plate} löschen`} className="text-sm text-red-500 active:scale-95">
              🗑
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={addVehicle} className="mt-2 flex gap-2">
        <input
          value={newPlate}
          onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
          placeholder="W 123 AB"
          maxLength={12}
          className="w-32 rounded-xl border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-bold uppercase tracking-widest outline-none focus:border-blue-600"
          required
        />
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Bezeichnung (optional)"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
        />
        <button disabled={busy} className="rounded-xl bg-blue-700 px-4 text-sm font-bold text-white active:scale-95 disabled:opacity-60">
          +
        </button>
      </form>
      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <h3 className="mb-1.5 mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">Parkschein-Verlauf</h3>
      <div className="space-y-2">
        {tickets.length === 0 && <p className="text-sm text-slate-500">Noch keine Parkscheine.</p>}
        {tickets.map((t) => {
          const active = t.status === "active" && t.stoppedAt == null && t.endAt > Date.now();
          const minutes = Math.round((t.endAt - t.startAt) / 60_000);
          return (
            <div key={t.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{t.zoneName}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? "bg-emerald-100 text-emerald-700" : t.status === "stopped" ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-500"
                }`}>
                  {active ? "AKTIV" : t.status === "stopped" ? "GESTOPPT" : "ABGELAUFEN"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {t.plate} · {new Date(t.startAt).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {fmtDuration(Math.max(1, minutes))}
                </span>
                <span className="font-bold text-slate-900">{euro(t.priceCents)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-400">
        ParkPilot · PWA – über das Browser-Menü „Zum Startbildschirm hinzufügen“ installieren 📲
      </p>
    </Sheet>
  );
}
