"use client";

import { useState } from "react";
import { api, paymentMethodLabel, type PaymentMethod } from "./types";
import { useI18n } from "./i18n";

/** Add-a-payment-method chooser: card, PayPal, Google Pay, Apple Pay (demo vault). */
export function PaymentMethodAdd({
  onAdded, onCancel,
}: { onAdded: (m: PaymentMethod) => void; onCancel?: () => void }) {
  const { t, terr } = useI18n();
  const [mode, setMode] = useState<"pick" | "card" | "paypal">("pick");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(payload: Record<string, string>) {
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ method: PaymentMethod }>("/api/payment-methods", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onAdded(data.method);
    } catch (err) {
      setError(terr(err));
    } finally {
      setBusy(false);
    }
  }

  const chip =
    "flex items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-2.5 text-xs font-bold text-slate-800 ring-1 ring-slate-300 active:scale-95 disabled:opacity-50";
  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600";

  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      {mode === "pick" && (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => setMode("card")} className={chip}>{t("pay.card")}</button>
          <button disabled={busy} onClick={() => setMode("paypal")} className={chip}>
            <span className="font-extrabold italic text-[#003087]">Pay</span>
            <span className="-ml-1.5 font-extrabold italic text-[#0070ba]">Pal</span>
          </button>
          <button disabled={busy} onClick={() => add({ type: "googlepay" })} className={chip}>
            <span className="font-extrabold text-slate-600">G</span> Pay
          </button>
          <button disabled={busy} onClick={() => add({ type: "applepay" })} className={chip}>
             Pay
          </button>
        </div>
      )}

      {mode === "card" && (
        <div className="space-y-2">
          <input
            className={`${input} font-mono tracking-wider`}
            placeholder={t("pay.cardNumber")}
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/[^\d ]/g, ""))}
            maxLength={23}
          />
          <div className="flex gap-2">
            <input
              className={`${input} w-28 text-center font-mono`}
              placeholder={t("pay.expiry")}
              inputMode="numeric"
              value={expiry}
              onChange={(e) => {
                let v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                setExpiry(v);
              }}
              maxLength={5}
            />
            <button
              disabled={busy}
              onClick={() => add({ type: "card", number, expiry })}
              className="flex-1 rounded-xl bg-blue-700 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
            >
              {busy ? "…" : t("pay.saveCard")}
            </button>
          </div>
        </div>
      )}

      {mode === "paypal" && (
        <div className="flex gap-2">
          <input
            className={input}
            type="email"
            placeholder={t("pay.ppEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            disabled={busy}
            onClick={() => add({ type: "paypal", email })}
            className="shrink-0 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
          >
            {busy ? "…" : "OK"}
          </button>
        </div>
      )}

      {mode !== "pick" && (
        <button onClick={() => setMode("pick")} className="mt-2 text-xs font-semibold text-blue-700">
          {t("pay.other")}
        </button>
      )}
      {onCancel && mode === "pick" && (
        <button onClick={onCancel} className="mt-2 text-xs font-semibold text-slate-500">
          {t("pay.cancel")}
        </button>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>}
      <p className="mt-2 text-[10px] text-slate-400">{t("pay.demoNote")}</p>
    </div>
  );
}

export function PaymentMethodList({
  methods, onChanged, selectable, selectedId, onSelect,
}: {
  methods: PaymentMethod[];
  onChanged: () => void;
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { t } = useI18n();
  async function remove(id: string) {
    await api(`/api/payment-methods?id=${id}`, { method: "DELETE" }).catch(() => {});
    onChanged();
  }
  async function makeDefault(id: string) {
    await api("/api/payment-methods", { method: "PATCH", body: JSON.stringify({ id }) }).catch(() => {});
    onChanged();
  }

  return (
    <div className="space-y-2">
      {methods.map((m) => (
        <div
          key={m.id}
          onClick={selectable ? () => onSelect?.(m.id) : undefined}
          className={`flex items-center gap-2.5 rounded-xl border-2 bg-white p-2.5 ${
            selectable
              ? `cursor-pointer ${selectedId === m.id ? "border-blue-600 bg-blue-50" : "border-slate-200"}`
              : "border-slate-200"
          }`}
        >
          {selectable && (
            <input type="radio" readOnly checked={selectedId === m.id} className="accent-blue-700" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
            {paymentMethodLabel(m)}
          </span>
          {m.isDefault && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{t("pay.default")}</span>
          )}
          {!selectable && (
            <>
              {!m.isDefault && (
                <button
                  onClick={() => makeDefault(m.id)}
                  className="text-[11px] font-semibold text-blue-700"
                >
                  {t("pay.makeDefault")}
                </button>
              )}
              <button onClick={() => remove(m.id)} aria-label={t("drawer.delete")} className="text-sm text-red-500">
                🗑
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
