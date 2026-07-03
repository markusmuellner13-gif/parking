"use client";

export default function Sheet({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] md:items-center" onClick={onClose}>
      <div
        className="pp-sheet flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:max-h-[80vh] md:max-w-md md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Schließen" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-500 active:scale-95">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,var(--safe-bottom))]">{children}</div>
      </div>
    </div>
  );
}
