"use client";

import Sheet from "./Sheet";

export default function LocationPrompt({
  onActivate, onClose,
}: { onActivate: () => void; onClose: () => void }) {
  return (
    <Sheet title="Standort aktivieren 📍" onClose={onClose}>
      <div className="mb-4 flex justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl ring-4 ring-blue-100">
          🗺️
        </span>
      </div>
      <p className="text-center text-sm leading-relaxed text-slate-600">
        Damit ParkPilot dich auf der Karte anzeigen und die <strong>Parkzonen in deiner Nähe</strong> finden
        kann, brauchen wir Zugriff auf deinen Standort. Dein Standort wird nur auf deinem Gerät verwendet und
        nicht auf unseren Servern gespeichert.
      </p>
      <button
        onClick={onActivate}
        className="mt-5 w-full rounded-xl bg-blue-700 py-3.5 text-base font-bold text-white shadow-md active:scale-[0.98]"
      >
        Standort aktivieren
      </button>
      <button onClick={onClose} className="mt-2 w-full py-2 text-sm font-semibold text-slate-500">
        Später
      </button>
    </Sheet>
  );
}
