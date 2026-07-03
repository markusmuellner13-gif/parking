"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api, euro, fmtDuration,
  type PaymentMethod, type Ticket, type User, type Vehicle,
} from "./types";
import { PaymentMethodAdd, PaymentMethodList } from "./PaymentMethods";
import { LANG_FLAGS, LANG_NAMES, useI18n, type Lang } from "./i18n";

type Props = {
  user: User | null;
  vehicles: Vehicle[];
  tickets: Ticket[];
  paymentMethods: PaymentMethod[];
  geoOk: boolean;
  dark: boolean;
  onToggleDark: () => void;
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
    user, vehicles, tickets, paymentMethods, geoOk, dark, onToggleDark,
    onRequestLocation, onVehiclesChanged, onPaymentsChanged, onTicketsChanged,
    onLoginClick, onLogout, onClose,
  } = props;
  const { t, terr, lang, setLang, locale } = useI18n();

  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [newPlate, setNewPlate] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function close() {
    setOpen(false);
    window.setTimeout(onClose, 220);
  }

  const active = tickets.filter((tk) => tk.status === "active" && tk.stoppedAt == null && tk.endAt > now);
  const history = tickets.filter((tk) => !active.includes(tk)).slice(0, 5);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/vehicles", { method: "POST", body: JSON.stringify({ plate: newPlate }) });
      setNewPlate("");
      onVehiclesChanged();
    } catch (err) {
      setError(terr(err));
    }
  }

  async function removeVehicle(id: string) {
    setError(null);
    try {
      await api(`/api/vehicles?id=${id}`, { method: "DELETE" });
      onVehiclesChanged();
    } catch (err) {
      setError(terr(err));
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
              <div className="text-sm font-bold text-slate-900">{user ? user.name : t("drawer.guest")}</div>
              <div className="text-xs text-slate-500">{user ? user.email : t("drawer.notLoggedIn")}</div>
            </div>
          </div>
          <button onClick={close} aria-label={t("drawer.close")} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-500 active:scale-95">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[max(1rem,var(--safe-bottom))]">
          {!user && (
            <Section title={t("drawer.account")}>
              <button
                onClick={onLoginClick}
                className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white active:scale-[0.98]"
              >
                {t("drawer.loginRegister")}
              </button>
            </Section>
          )}

          {user && (
            <>
              <Section title={t("drawer.activeTickets")}>
                {active.length === 0 && <p className="text-sm text-slate-500">{t("drawer.noActive")}</p>}
                <div className="space-y-2">
                  {active.map((tk) => (
                    <div key={tk.id} className="rounded-xl bg-emerald-600 p-3 text-white">
                      <div className="flex items-center justify-between text-xs text-emerald-100">
                        <span className="truncate">{tk.plate} · {tk.zoneName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="text-xl font-extrabold tabular-nums">{remaining(tk.endAt, now)}</span>
                        <button
                          onClick={() => stopTicket(tk.id)}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 active:scale-95"
                        >
                          {t("ticket.stop", { p: euro(tk.priceCents) })}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title={t("drawer.vehicles")}>
                <div className="space-y-2">
                  {vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
                      <span className="rounded-md border border-slate-400 px-2 py-0.5 font-mono text-sm font-bold tracking-widest">{v.plate}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{v.label ?? ""}</span>
                      <button onClick={() => removeVehicle(v.id)} aria-label={t("drawer.delete")} className="text-sm text-red-500">🗑</button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addVehicle} className="mt-2 flex gap-2">
                  <input
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder={t("drawer.plate")}
                    maxLength={12}
                    required
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-bold uppercase tracking-widest outline-none focus:border-blue-600"
                  />
                  <button className="shrink-0 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white active:scale-95">+</button>
                </form>
              </Section>

              <Section title={t("drawer.payments")}>
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
                    {t("drawer.addPayment")}
                  </button>
                )}
              </Section>

              <Section title={t("drawer.history")}>
                {history.length === 0 && <p className="text-sm text-slate-500">{t("drawer.noTickets")}</p>}
                <div className="space-y-2">
                  {history.map((tk) => (
                    <div key={tk.id} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-semibold text-slate-800">{tk.zoneName}</span>
                        <span className="shrink-0 font-bold text-slate-900">{euro(tk.priceCents)}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {tk.plate} · {new Date(tk.startAt).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{fmtDuration(Math.max(1, Math.round((tk.endAt - tk.startAt) / 60_000)))}
                        {tk.paymentLabel ? ` · ${tk.paymentLabel}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          <Section title={t("drawer.language")}>
            <div className="grid grid-cols-3 gap-2">
              {(["de", "it", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-xl border-2 px-2 py-2 text-xs font-bold transition ${
                    lang === l ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {LANG_FLAGS[l]} {LANG_NAMES[l]}
                </button>
              ))}
            </div>
          </Section>

          <Section title={t("drawer.appearance")}>
            <button
              onClick={onToggleDark}
              role="switch"
              aria-checked={dark}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 active:scale-[0.99]"
            >
              <span className="text-sm font-semibold text-slate-700">
                {dark ? t("drawer.dark") : t("drawer.light")}
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition-colors ${dark ? "bg-blue-700" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${dark ? "translate-x-[22px]" : "translate-x-0.5"}`}
                />
              </span>
            </button>
          </Section>

          <Section title={t("drawer.location")}>
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${geoOk ? "bg-emerald-500" : "bg-red-400"}`} />
              <span className="flex-1 text-sm text-slate-600">
                {geoOk ? t("drawer.locOn") : t("drawer.locOff")}
              </span>
              {!geoOk && (
                <button
                  onClick={onRequestLocation}
                  className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white active:scale-95"
                >
                  {t("drawer.activate")}
                </button>
              )}
            </div>
          </Section>

          <Section title={t("drawer.legal")}>
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
            <Section title={t("drawer.account")}>
              <button
                onClick={logout}
                className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 active:scale-[0.98]"
              >
                {t("drawer.logout")}
              </button>
            </Section>
          )}

          {error && <p className="mx-5 my-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <p className="px-5 py-4 text-center text-[11px] text-slate-400">{t("drawer.install")}</p>
        </div>
      </aside>
    </div>
  );
}
