"use client";

import { useMemo, useState } from "react";
import Sheet from "./Sheet";
import TimeWheel from "./TimeWheel";
import { PaymentMethodAdd, PaymentMethodList } from "./PaymentMethods";
import {
  api, euro, fmtDuration, zoneDisplayName,
  type PaymentMethod, type Ticket, type Vehicle, type Zone,
} from "./types";
import { useI18n } from "./i18n";

const PRESETS = [30, 60, 120, 180];

export default function ParkSheet({
  zone, vehicles, paymentMethods, onVehiclesChanged, onPaymentsChanged, onClose, onBought,
}: {
  zone: Zone;
  vehicles: Vehicle[];
  paymentMethods: PaymentMethod[];
  onVehiclesChanged: () => void;
  onPaymentsChanged: () => void;
  onClose: () => void;
  onBought: (t: Ticket) => void;
}) {
  const { t, terr } = useI18n();
  const maxMin = zone.maxStayMinutes ?? 720;
  const [minutes, setMinutes] = useState(Math.min(60, maxMin));
  const [vehicleId, setVehicleId] = useState<string | null>(vehicles[0]?.id ?? null);
  const [newPlate, setNewPlate] = useState("");
  const [addingPlate, setAddingPlate] = useState(vehicles.length === 0);
  const [paymentId, setPaymentId] = useState<string | null>(
    paymentMethods.find((m) => m.isDefault)?.id ?? paymentMethods[0]?.id ?? null
  );
  const [addingPayment, setAddingPayment] = useState(paymentMethods.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const priceCents = useMemo(
    () => Math.round(((zone.priceHourCents ?? 0) * minutes) / 60),
    [zone.priceHourCents, minutes]
  );

  function bump(delta: number) {
    setMinutes((m) => Math.min(maxMin, Math.max(15, m + delta)));
  }

  async function addPlate(): Promise<Vehicle | null> {
    const data = await api<{ vehicle: Vehicle }>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify({ plate: newPlate }),
    });
    onVehiclesChanged();
    setAddingPlate(false);
    setVehicleId(data.vehicle.id);
    return data.vehicle;
  }

  async function buy() {
    setError(null);
    setBusy(true);
    try {
      let vid = vehicleId;
      if (addingPlate) {
        if (!newPlate.trim()) throw new Error(t("park.plateFirst"));
        const v = await addPlate();
        vid = v?.id ?? null;
      }
      if (!vid) throw new Error(t("park.pickVehicle"));
      if (!paymentId) throw new Error(t("park.pickPayment"));
      const data = await api<{ ticket: Ticket }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: vid,
          paymentMethodId: paymentId,
          minutes,
          zone: {
            id: zone.id, name: zoneDisplayName(zone, t), lat: zone.lat, lng: zone.lng,
            priceHourCents: zone.priceHourCents, maxStayMinutes: zone.maxStayMinutes,
          },
        }),
      });
      onBought(data.ticket);
    } catch (err) {
      setError(terr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={t("park.title")} onClose={onClose}>
      <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
        📍 <span className="font-semibold text-slate-900">{zoneDisplayName(zone, t)}</span>
        {zone.maxStayMinutes && <span> · {t("park.max")} {fmtDuration(zone.maxStayMinutes)}</span>}
      </p>

      {/* vehicle / plate (mandatory) */}
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{t("park.vehicle")}</h3>
      {!addingPlate && vehicles.length > 0 ? (
        <div className="mb-2 space-y-2">
          {vehicles.map((v) => (
            <label
              key={v.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                vehicleId === v.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="vehicle"
                checked={vehicleId === v.id}
                onChange={() => setVehicleId(v.id)}
                className="accent-blue-700"
              />
              <span className="rounded-md border border-slate-400 bg-white px-2 py-0.5 font-mono text-sm font-bold tracking-widest">
                {v.plate}
              </span>
              {v.label && <span className="text-xs text-slate-500">{v.label}</span>}
            </label>
          ))}
          <button onClick={() => setAddingPlate(true)} className="text-sm font-semibold text-blue-700">
            {t("park.otherPlate")}
          </button>
        </div>
      ) : (
        <div className="mb-2">
          <input
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
            placeholder={t("park.platePlaceholder")}
            maxLength={12}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-3 text-center font-mono text-lg font-bold tracking-[0.2em] uppercase outline-none focus:border-blue-600"
          />
          {vehicles.length > 0 && (
            <button onClick={() => setAddingPlate(false)} className="mt-1.5 text-sm font-semibold text-blue-700">
              {t("park.savedVehicle")}
            </button>
          )}
        </div>
      )}

      {/* duration */}
      <h3 className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">{t("park.duration")}</h3>
      <div className="relative rounded-2xl bg-slate-50 py-3 ring-1 ring-slate-200">
        <TimeWheel minutes={minutes} maxMinutes={maxMin} priceHourCents={zone.priceHourCents} onChange={setMinutes} />
        <button
          onClick={() => bump(-15)}
          aria-label={t("park.less")}
          className="absolute bottom-3 left-3 h-10 w-10 rounded-full bg-white text-lg font-bold shadow ring-1 ring-slate-200 active:scale-95"
        >
          −
        </button>
        <button
          onClick={() => bump(15)}
          aria-label={t("park.more")}
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-white text-lg font-bold shadow ring-1 ring-slate-200 active:scale-95"
        >
          +
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        {PRESETS.filter((p) => p <= maxMin).map((p) => (
          <button
            key={p}
            onClick={() => setMinutes(p)}
            className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
              minutes === p ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {fmtDuration(p)}
          </button>
        ))}
      </div>

      {/* payment method (mandatory) */}
      <h3 className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">{t("park.payment")}</h3>
      {!addingPayment && paymentMethods.length > 0 ? (
        <>
          <PaymentMethodList
            methods={paymentMethods}
            onChanged={onPaymentsChanged}
            selectable
            selectedId={paymentId}
            onSelect={setPaymentId}
          />
          <button onClick={() => setAddingPayment(true)} className="mt-1.5 text-sm font-semibold text-blue-700">
            {t("park.otherPayment")}
          </button>
        </>
      ) : (
        <PaymentMethodAdd
          onAdded={(m) => {
            setPaymentId(m.id);
            setAddingPayment(false);
            onPaymentsChanged();
          }}
          onCancel={paymentMethods.length > 0 ? () => setAddingPayment(false) : undefined}
        />
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        onClick={buy}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-blue-700 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? t("park.buying") : t("park.buy", { p: euro(priceCents) })}
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-400">{t("park.demoNote")}</p>
    </Sheet>
  );
}
