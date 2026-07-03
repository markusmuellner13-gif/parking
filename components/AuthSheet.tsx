"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { api, type User } from "./types";

export default function AuthSheet({
  onClose, onAuthed,
}: { onClose: () => void; onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ user: User }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email, password } : { email, name, password }),
      });
      onAuthed(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

  return (
    <Sheet title={mode === "login" ? "Willkommen zurück 👋" : "Konto erstellen"} onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            className={`rounded-lg py-2 transition ${mode === m ? "bg-white text-blue-700 shadow" : "text-slate-500"}`}
          >
            {m === "login" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <input className={input} placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        )}
        <input className={input} type="email" placeholder="E-Mail-Adresse" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input
          className={input}
          type="password"
          placeholder={mode === "register" ? "Passwort (min. 8 Zeichen)" : "Passwort"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
          minLength={mode === "register" ? 8 : undefined}
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Einen Moment…" : mode === "login" ? "Anmelden" : "Konto erstellen"}
        </button>
      </form>
      <p className="mt-3 text-center text-[11px] text-slate-400">
        Dein Kennzeichen kannst du nach der Anmeldung hinterlegen – es ist Pflicht für den Parkschein-Kauf.
      </p>
    </Sheet>
  );
}
