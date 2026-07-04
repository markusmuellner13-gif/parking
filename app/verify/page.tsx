"use client";

import { useState } from "react";
import Link from "next/link";

type VerifyResult = {
  plate: string;
  valid: boolean;
  checkedAt: number;
  tickets: { zoneName: string; validFrom: number; validUntil: number }[];
};

/** Enforcement plate check – officer-facing, no login required. */
export default function VerifyPage() {
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/verify?plate=${encodeURIComponent(plate)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Errore");
      setResult(data as VerifyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  const fmt = (ts: number) =>
    new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-dvh w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-md px-5 pb-16 pt-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-xl">🚓</span>
          <div className="leading-tight">
            <h1 className="text-xl font-extrabold text-slate-900">Controllo targa</h1>
            <p className="text-xs text-slate-500">Verifica ticket di sosta digitale · Digital ticket check</p>
          </div>
        </div>

        <form onSubmit={check} className="flex gap-2">
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="Targa / Plate"
            maxLength={12}
            required
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-3 text-center font-mono text-lg font-bold uppercase tracking-[0.2em] outline-none focus:border-blue-600"
          />
          <button
            disabled={busy}
            className="shrink-0 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
          >
            {busy ? "…" : "Verifica"}
          </button>
        </form>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {result && (
          <div
            className={`pp-sheet mt-5 rounded-2xl p-5 text-white shadow-xl ${result.valid ? "bg-emerald-600" : "bg-red-600"}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{result.valid ? "✅" : "❌"}</span>
              <div>
                <div className="font-mono text-xl font-extrabold tracking-widest">{result.plate}</div>
                <div className="text-sm font-semibold opacity-90">
                  {result.valid
                    ? "Ticket valido · Gültiger Parkschein · Valid ticket"
                    : "Nessun ticket attivo · Kein aktiver Parkschein · No active ticket"}
                </div>
              </div>
            </div>
            {result.tickets.map((tk, i) => (
              <div key={i} className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">
                <div className="font-semibold">{tk.zoneName}</div>
                <div className="opacity-90">
                  {fmt(tk.validFrom)} → <strong>{fmt(tk.validUntil)}</strong>
                </div>
              </div>
            ))}
            <p className="mt-3 text-[11px] opacity-75">
              Verificato: {fmt(result.checkedAt)} · Nessun dato personale viene mostrato.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-400">
          Questo controllo mostra esclusivamente la validità del ticket digitale ParkPilot per la targa inserita
          – nessun dato personale. This check only shows ParkPilot digital ticket validity for the entered
          plate – no personal data.
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-blue-700">← ParkPilot</Link>
        </p>
      </div>
    </div>
  );
}
