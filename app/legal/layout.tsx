import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow ring-1 ring-slate-200"
        >
          ← Zurück zu ParkPilot
        </Link>
        <article className="prose-sm rounded-2xl bg-white p-6 leading-relaxed text-slate-700 shadow ring-1 ring-slate-200 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-slate-900 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </article>
        <p className="mt-6 text-center text-xs text-slate-400">
          ParkPilot · Documenti legali (bozza) – Rechtsdokumente (Entwurf)
        </p>
      </div>
    </div>
  );
}
