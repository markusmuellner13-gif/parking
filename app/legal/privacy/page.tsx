export const metadata = { title: "Informativa sulla Privacy – ParkPilot" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Informativa sulla Privacy</h1>
      <p>
        <em>
          Informativa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (&laquo;GDPR&raquo;) e del
          D.Lgs. 196/2003 (&laquo;Codice in materia di protezione dei dati personali&raquo;), come modificato dal
          D.Lgs. 101/2018. Ultimo aggiornamento: luglio 2026. Bozza – da far verificare da un legale prima del
          lancio commerciale.
        </em>
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        Titolare del trattamento è <strong>[Nome / Ragione sociale]</strong>, con sede in [indirizzo],
        e-mail: [e-mail di contatto]. (Art. 4 n. 7 e art. 24 GDPR.)
      </p>

      <h2>2. Dati trattati e finalità</h2>
      <ul>
        <li>
          <strong>Dati dell&apos;account</strong> (nome, e-mail, password cifrata): creazione e gestione
          dell&apos;account – base giuridica: esecuzione del contratto (art. 6, par. 1, lett. b GDPR).
        </li>
        <li>
          <strong>Targa del veicolo</strong>: obbligatoria per l&apos;acquisto del ticket di sosta digitale –
          esecuzione del contratto (art. 6, par. 1, lett. b GDPR).
        </li>
        <li>
          <strong>Dati di geolocalizzazione</strong>: mostrare la posizione sulla mappa e trovare le zone di
          sosta vicine. Il trattamento avviene <strong>solo previo consenso</strong> tramite il browser
          (art. 6, par. 1, lett. a GDPR) ed è revocabile in ogni momento nelle impostazioni del dispositivo.
          La posizione non viene memorizzata sui nostri server.
        </li>
        <li>
          <strong>Dati di pagamento</strong>: per le carte vengono conservati esclusivamente circuito e ultime
          4 cifre; il numero completo non viene mai salvato – esecuzione del contratto e obblighi di legge
          (art. 6, par. 1, lett. b e c GDPR).
        </li>
        <li>
          <strong>Cronologia dei ticket</strong>: prova d&apos;acquisto e assistenza clienti – esecuzione del
          contratto e legittimo interesse (art. 6, par. 1, lett. f GDPR).
        </li>
      </ul>

      <h2>3. Conservazione</h2>
      <p>
        I dati dell&apos;account sono conservati fino alla cancellazione dell&apos;account; i documenti
        contabili per 10 anni ai sensi dell&apos;art. 2220 Codice Civile e della normativa fiscale.
      </p>

      <h2>4. Destinatari</h2>
      <p>
        Fornitori di hosting e database (Vercel Inc., Turso/CTA Data) quali responsabili del trattamento ex
        art. 28 GDPR; dati cartografici richiesti a OpenStreetMap/Overpass senza trasmissione di dati
        identificativi dell&apos;utente. Eventuali trasferimenti extra-UE avvengono sulla base di clausole
        contrattuali standard (art. 46 GDPR).
      </p>

      <h2>5. Diritti dell&apos;interessato</h2>
      <p>
        Ai sensi degli artt. 15–22 GDPR hai diritto di accesso, rettifica, cancellazione, limitazione,
        portabilità e opposizione, nonché di revocare il consenso in qualsiasi momento. Le richieste vanno
        inviate a [e-mail di contatto].
      </p>

      <h2>6. Reclamo</h2>
      <p>
        Hai il diritto di proporre reclamo al <strong>Garante per la protezione dei dati personali</strong>
        (Piazza Venezia 11, 00187 Roma, www.garanteprivacy.it) ai sensi dell&apos;art. 77 GDPR.
      </p>

      <h2>7. Sicurezza</h2>
      <p>
        Adottiamo misure tecniche e organizzative adeguate (art. 32 GDPR): cifratura TLS, password con hash
        scrypt, accesso ai dati limitato alla sessione autenticata.
      </p>
    </>
  );
}
