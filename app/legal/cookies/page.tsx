export const metadata = { title: "Cookie Policy – ParkPilot" };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>
        <em>
          Informativa ai sensi delle Linee guida del Garante per la protezione dei dati personali su cookie e
          altri strumenti di tracciamento (10 giugno 2021) e dell&apos;art. 122 del D.Lgs. 196/2003. Ultimo
          aggiornamento: luglio 2026.
        </em>
      </p>

      <h2>1. Quali strumenti utilizziamo</h2>
      <ul>
        <li>
          <strong>Cookie tecnico di sessione</strong> (<code>pp_session</code>): mantiene l&apos;accesso
          all&apos;account. Strettamente necessario al servizio richiesto – non richiede consenso
          (art. 122, c. 1 Codice Privacy).
        </li>
        <li>
          <strong>Storage locale del browser / Service Worker</strong>: memorizza l&apos;app (PWA) per
          l&apos;uso offline. Strettamente tecnico – non richiede consenso.
        </li>
      </ul>

      <h2>2. Cosa non utilizziamo</h2>
      <p>
        Non utilizziamo cookie di profilazione, cookie di terze parti a fini pubblicitari né strumenti di
        analisi che richiedano il consenso preventivo. Per questo motivo l&apos;app non mostra un banner
        cookie: qualora in futuro venissero introdotti strumenti non tecnici, verrà richiesto il consenso
        preventivo conformemente alle Linee guida del Garante.
      </p>

      <h2>3. Gestione</h2>
      <p>
        Puoi cancellare i cookie e lo storage locale in qualsiasi momento dalle impostazioni del browser; in tal
        caso dovrai effettuare nuovamente l&apos;accesso.
      </p>
    </>
  );
}
