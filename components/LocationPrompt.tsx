"use client";

import Sheet from "./Sheet";
import { useI18n } from "./i18n";

export default function LocationPrompt({
  onActivate, onClose,
}: { onActivate: () => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet title={t("locprompt.title")} onClose={onClose}>
      <div className="mb-4 flex justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl ring-4 ring-blue-100">
          🗺️
        </span>
      </div>
      <p className="text-center text-sm leading-relaxed text-slate-600">{t("locprompt.body")}</p>
      <button
        onClick={onActivate}
        className="mt-5 w-full rounded-xl bg-blue-700 py-3.5 text-base font-bold text-white shadow-md active:scale-[0.98]"
      >
        {t("locprompt.activate")}
      </button>
      <button onClick={onClose} className="mt-2 w-full py-2 text-sm font-semibold text-slate-500">
        {t("locprompt.later")}
      </button>
    </Sheet>
  );
}
