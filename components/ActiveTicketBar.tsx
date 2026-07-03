"use client";

import { useEffect, useState } from "react";
import { api, euro, type Ticket } from "./types";
import { useI18n } from "./i18n";

function remaining(t: Ticket, now: number): string {
  const ms = Math.max(0, t.endAt - now);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function ActiveTicketBar({
  tickets, onChanged, floating,
}: { tickets: Ticket[]; onChanged: () => void; floating?: boolean }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (tickets.length === 0) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (tickets.some((t) => t.endAt <= Date.now())) onChanged();
    }, 1000);
    return () => window.clearInterval(id);
  }, [tickets, onChanged]);

  if (tickets.length === 0) return null;

  async function act(t: Ticket, action: "stop" | "extend") {
    setBusyId(t.id);
    try {
      await api(`/api/tickets/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify(action === "extend" ? { action, minutes: 30 } : { action }),
      });
      onChanged();
    } catch {
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={floating ? "mt-2 space-y-2" : "space-y-2 border-b border-slate-200 p-3"}>
      {tickets.map((tk) => {
        const expanded = expandedId === tk.id;
        return (
          <div key={tk.id} className={`overflow-hidden rounded-2xl bg-emerald-600 text-white shadow-lg ${floating ? "ring-1 ring-emerald-700/40" : ""}`}>
            <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left" onClick={() => setExpandedId(expanded ? null : tk.id)}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-medium text-emerald-100">
                  {tk.plate} · {tk.zoneName}
                </div>
                <div className="text-lg font-extrabold tabular-nums">{remaining(tk, now)}</div>
              </div>
              <span className="text-emerald-100">{expanded ? "▴" : "▾"}</span>
            </button>
            {expanded && (
              <div className="flex gap-2 px-4 pb-3">
                <button
                  onClick={() => act(tk, "extend")}
                  disabled={busyId === tk.id}
                  className="flex-1 rounded-xl bg-white/20 py-2 text-xs font-bold active:scale-95 disabled:opacity-50"
                >
                  {t("ticket.extend")}
                </button>
                <button
                  onClick={() => act(tk, "stop")}
                  disabled={busyId === tk.id}
                  className="flex-1 rounded-xl bg-white py-2 text-xs font-bold text-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {t("ticket.stop", { p: euro(tk.priceCents) })}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
