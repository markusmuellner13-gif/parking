"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api, euro, fmtDuration,
  type PaymentMethod, type Ticket, type User, type Vehicle,
} from "./types";
import { PaymentMethodAdd, PaymentMethodList } from "./PaymentMethods";

type Props = {
  user: User | null;
  vehicles: Vehicle[];
  tickets: Ticket[];
  paymentMethods: PaymentMethod[];
  geoOk: boolean;
  onRequestLocation: () => void;
  onVehiclesChanged: () => void;
  onPaymentsChanged: () => void;
  onTicketsChanged: () => void;
  onLoginClick: () => void;
  onLogout: () => void;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-100 px-5 py-4">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function remaining(endAt: number, now: number): string {
  const ms = Math.max(0, endAt - now);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SideDrawer(props: Props) {
  const {
    user, vehicles, tickets, paymentMethods, geoOk,
    onRequestLocation, onVehiclesChanged, onPaymentsChanged, onTicketsChanged,
    onLoginClick, onLogout, onClose,
  } = props;

  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [newPlate, setNewPlate] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // slide-in on mount, slide-out on close
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  function close() {
    setOpen(false);
    window.setTimeout(onClose, 220);
  }

  const active = tickets.filter((t) => t.status === "active" && t.stoppedAt == null && t.endAt > now);
  const history = tickets.filter((t) => !active.includes(t)).slice(0, 5);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/vehicles", { method: "POST", body: JSON.stringify({ plate: newPlate }) });
      setNewPlate("");
      onVehiclesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
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

  async function stopTicket(id: string) {
    await api(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ action: "stop" }) }).catch(() => {});
    onTicketsChanged();
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  const legalLinks = [
    { href: "/legal/privacy", label: "Informativa sulla Privacy", icon: "🔒" },
    { href: "/legal/terms", label: "Termini e Condizioni", icon: "📜" },
    { href: "/legal/cookies", label: "Cookie Policy", icon: "🍪" },
    { href: "/legal/note-legali", label: "Note Legali", icon: "⚖️" },
  ];

  return (
    <div
      className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      onClick={close}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-[max(1rem,var(--safe-top))]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-base font-bold text-white">
              {user ? user.name[0]?.toUpperCase() : "👤"}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">{user ? user.name : "Gast"}</div>
              <div className="text-xs text-slate-500">{user ? user.email : "Nicht angemeldet"}</div>
            </div>
          </div>
          <button onClick={close} aria-label="Schließen" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-500 active:scale-95">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[max(1rem,var(--safe-bottom))]">
          {!user && (
            <Section title="Konto">
              <button
                onClick={onLoginClick}
                className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white active:scale-[0.98]"
              >
                Anmelden / Registrieren
              </button>
            </Section>
          )}

          {user && (
            <>
              <Section title="Aktive Parkscheine">
                {active.length === 0 && <p className="text-sm text-slate-500">Kein aktiver Parkschein.</p>}
                <div className="space-y-2">
                  {active.map((t) => (
                    <div key={t.id} className="rounded-xl bg-emerald-600 p-3 text-white">
                      <div className="flex items-center justify-between text-xs text-emerald-100">
                        <span className="truncate">{t.plate} · {t.zoneName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="text-xl font-extrabold tabular-nums">{remaining(t.endAt, now)}</span>
                        <button
                          onClick={() => stopTicket(t.id)}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 active:scale-95"
                        >
                          Stoppen ({euro(t.priceCents)})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Fahrzeuge & Kennzeichen">
                <div className="space-y-2">
                  {vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
                      <span className="rounded-md border border-slate-400 px-2 py-0.5 font-mono text-sm font-bold tracking-widest">{v.plate}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{v.label ?? ""}</span>
                      <button onClick={() => removeVehicle(v.id)} aria-label={`${v.plate} löschen`} className="text-sm text-red-500">🗑</button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addVehicle} className="mt-2 flex gap-2">
                  <input
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="Kennzeichen"
                    maxLength={12}
                    required
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-bold uppercase tracking-widest outline-none focus:border-blue-600"
                  />
                  <button className="shrink-0 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white active:scale-95">+</button>
                </form>
              </Section>

              <Section title="Zahlungsmethoden">
                <PaymentMethodList methods={paymentMethods} onChanged={onPaymentsChanged} />
                {addingPayment ? (
                  <div className="mt-2">
                    <PaymentMethodAdd
                      onAdded={() => { setAddingPayment(false); onPaymentsChanged(); }}
                      onCancel={() => setAddingPayment(false)}
                    />
                  </div>
                ) : (
                  <button onClick={() => setAddingPayment(true)} className="mt-2 text-sm font-semibold text-blue-700">
                    + Zahlungsmethode hinzufügen
                  </button>
                )}
              </Section>

              <Section title="Verlauf">
                {history.length === 0 && <p className="text-sm text-slate-500">Noch keine Parkscheine.</p>}
                <div className="space-y-2">
                  {history.map((t) => (
                    <div key={t.id} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-semibold text-slate-800">{t.zoneName}</span>
                        <span className="shrink-0 font-bold text-slate-900">{euro(t.priceCents)}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {t.plate} · {new Date(t.startAt).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{fmtDuration(Math.max(1, Math.round((t.endAt - t.startAt) / 60_000)))}
                        {t.paymentLabel ? ` · ${t.paymentLabel}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          <Section title="Standort">
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${geoOk ? "bg-emerald-500" : "bg-red-400"}`} />
              <span className="flex-1 text-sm text-slate-600">
                {geoOk ? "Ortung aktiv – du wirst auf der Karte angezeigt." : "Ortung ist deaktiviert."}
              </span>
              {!geoOk && (
                <button
                  onClick={onRequestLocation}
                  className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white active:scale-95"
                >
                  Aktivieren
                </button>
              )}
            </div>
          </Section>

          <Section title="Rechtliches / Legale">
            <div className="space-y-1.5">
              {legalLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 active:scale-[0.99]"
                >
                  <span>{l.icon}</span>
                  <span className="flex-1">{l.label}</span>
                  <span className="text-slate-400">›</span>
                </Link>
              ))}
            </div>
          </Section>

          {user && (
            <Section title="Konto">
              <button
                onClick={logout}
                className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 active:scale-[0.98]"
              >
                Abmelden
              </button>
            </Section>
          )}

          {error && <p className="mx-5 my-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <p className="px-5 py-4 text-center text-[11px] text-slate-400">
            ParkPilot · PWA – über das Browser-Menü „Zum Startbildschirm hinzufügen“ installieren 📲
          </p>
        </div>
      </aside>
    </div>
  );
}
