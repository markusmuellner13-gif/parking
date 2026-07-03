export const metadata = { title: "Note Legali – ParkPilot" };

export default function NoteLegaliPage() {
  return (
    <>
      <h1>Note Legali</h1>
      <p>
        <em>
          Informazioni generali obbligatorie ai sensi dell&apos;art. 7 del D.Lgs. 70/2003 (commercio
          elettronico) e dell&apos;art. 2250 Codice Civile. Bozza – completare con i dati societari reali prima
          del lancio.
        </em>
      </p>

      <h2>Gestore del servizio</h2>
      <ul>
        <li>Denominazione: <strong>[Nome / Ragione sociale]</strong></li>
        <li>Sede legale: [indirizzo completo]</li>
        <li>Partita IVA / Codice fiscale: [P.IVA]</li>
        <li>Numero REA / Registro delle imprese: [REA – solo per società]</li>
        <li>Capitale sociale: [importo – solo per società di capitali]</li>
        <li>PEC: [indirizzo PEC]</li>
        <li>E-mail di contatto: [e-mail]</li>
      </ul>

      <h2>Contenuti e mappe</h2>
      <p>
        Dati cartografici © OpenStreetMap contributors (licenza ODbL), tile © CARTO. Dati sulle zone di sosta in
        parte da fonti comunali ufficiali e in parte stimati: fa fede la segnaletica in loco.
      </p>

      <h2>Risoluzione delle controversie</h2>
      <p>
        Piattaforma della Commissione Europea per la risoluzione online delle controversie (ODR):
        ec.europa.eu/consumers/odr. Non aderiamo attualmente ad alcun organismo di conciliazione specifico.
      </p>
    </>
  );
}
