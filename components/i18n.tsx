"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "de" | "it" | "en";

const DICT: Record<string, { de: string; it: string; en: string }> = {
  // app chrome
  "app.tagline": { de: "Dein Park-Copilot", it: "Il tuo copilota di parcheggio", en: "Your parking copilot" },
  "header.login": { de: "Anmelden", it: "Accedi", en: "Sign in" },
  "demo.banner": {
    de: "⚠️ Demo-Speicher aktiv – Turso-Datenbank noch nicht verbunden, Konten können zurückgesetzt werden.",
    it: "⚠️ Memoria demo attiva – database Turso non collegato, gli account possono essere azzerati.",
    en: "⚠️ Demo storage active – Turso database not connected yet, accounts may be reset.",
  },
  "map.loading": { de: "Karte wird geladen…", it: "Caricamento mappa…", en: "Loading map…" },

  // geolocation
  "geo.denied.sidebar": {
    de: "📍 Standort nicht freigegeben – es wird Wien angezeigt. Erlaube die Ortung für Zonen in deiner Nähe.",
    it: "📍 Posizione non autorizzata – viene mostrata Vienna. Consenti la localizzazione per le zone vicino a te.",
    en: "📍 Location not allowed – showing Vienna. Enable location to see zones near you.",
  },
  "geo.denied.mobile": {
    de: "📍 Standort nicht freigegeben – erlaube die Ortung in den Browser-Einstellungen, damit ParkPilot dich auf der Karte zeigt.",
    it: "📍 Posizione non autorizzata – consenti la localizzazione nelle impostazioni del browser perché ParkPilot ti mostri sulla mappa.",
    en: "📍 Location not allowed – enable it in your browser settings so ParkPilot can show you on the map.",
  },
  "geo.unavailable": {
    de: "Standort nicht verfügbar – bitte Ortungsdienste erlauben.",
    it: "Posizione non disponibile – consenti i servizi di localizzazione.",
    en: "Location unavailable – please allow location services.",
  },
  "geo.blocked": {
    de: "Ortung blockiert – bitte in den Browser-/Systemeinstellungen erlauben.",
    it: "Localizzazione bloccata – consentila nelle impostazioni del browser/sistema.",
    en: "Location blocked – please allow it in your browser/system settings.",
  },

  // zones
  "zones.searching": { de: "Parkzonen werden gesucht…", it: "Ricerca zone di sosta…", en: "Searching parking zones…" },
  "zones.satSearching": { de: "🛰️ Parkzonen werden gesucht…", it: "🛰️ Ricerca zone di sosta…", en: "🛰️ Searching parking zones…" },
  "zones.count": { de: "{n} Parkzonen in der Nähe", it: "{n} zone di sosta nelle vicinanze", en: "{n} parking zones nearby" },
  "zones.none": {
    de: "Keine Zonen gefunden. Verschiebe die Karte und tippe auf „Diesen Bereich absuchen“.",
    it: "Nessuna zona trovata. Sposta la mappa e tocca «Cerca in quest'area».",
    en: "No zones found. Move the map and tap “Search this area”.",
  },
  "zones.noneMobile": {
    de: "Keine Parkzonen gefunden – verschiebe die Karte und suche erneut.",
    it: "Nessuna zona trovata – sposta la mappa e riprova.",
    en: "No parking zones found – move the map and search again.",
  },
  "zones.searchHere": { de: "🔍 Diesen Bereich absuchen", it: "🔍 Cerca in quest'area", en: "🔍 Search this area" },
  "zones.searchingShort": { de: "Suche…", it: "Ricerca…", en: "Searching…" },
  "zones.loadError": {
    de: "Parkzonen konnten nicht geladen werden.",
    it: "Impossibile caricare le zone di sosta.",
    en: "Could not load parking zones.",
  },

  // zone kinds & generic names
  "kind.street": { de: "Straßenparken", it: "Parcheggio su strada", en: "Street parking" },
  "kind.garage": { de: "Parkhaus", it: "Parcheggio multipiano", en: "Parking garage" },
  "kind.underground": { de: "Tiefgarage", it: "Parcheggio sotterraneo", en: "Underground garage" },
  "kind.surface": { de: "Parkplatz", it: "Parcheggio", en: "Parking lot" },
  "generic.ticket_machine": {
    de: "Straßenparken (Parkscheinautomat)",
    it: "Sosta su strada (parcometro)",
    en: "Street parking (ticket machine)",
  },
  "hours.unverified": { de: "24/7 (unbestätigt)", it: "24/7 (non confermato)", en: "24/7 (unverified)" },

  // zone detail
  "zone.free": { de: "gratis", it: "gratuito", en: "free" },
  "zone.estimated": { de: "geschätzt", it: "stimato", en: "estimated" },
  "zone.estimatedStar": { de: "geschätzt*", it: "stimato*", en: "estimated*" },
  "zone.here": { de: "direkt bei dir", it: "proprio qui", en: "right here" },
  "zone.away": { de: "{d} entfernt", it: "a {d}", en: "{d} away" },
  "detail.tariff": { de: "Tarif", it: "Tariffa", en: "Rate" },
  "detail.maxstay": { de: "Max. Dauer", it: "Sosta max", en: "Max stay" },
  "detail.unlimited": { de: "unbegrenzt", it: "illimitata", en: "unlimited" },
  "detail.spots": { de: "Plätze", it: "Posti", en: "Spaces" },
  "detail.source": { de: "Quelle", it: "Fonte", en: "Source" },
  "detail.sourceCity": { de: "Stadt-Tarif", it: "Tariffa comunale", en: "City tariff" },
  "detail.hours": { de: "🕐 Gebührenpflichtig: {h}", it: "🕐 A pagamento: {h}", en: "🕐 Paid hours: {h}" },
  "detail.estimateNote": {
    de: "* Richtwert – maßgeblich ist die Beschilderung vor Ort.",
    it: "* Valore indicativo – fa fede la segnaletica in loco.",
    en: "* Indicative – on-site signage is authoritative.",
  },
  "detail.park": { de: "Parkschein lösen", it: "Acquista il ticket", en: "Buy parking ticket" },
  "detail.parkFree": { de: "Parkvorgang starten (gratis)", it: "Avvia la sosta (gratuita)", en: "Start parking (free)" },

  // park sheet
  "park.title": { de: "Parkschein lösen", it: "Acquista il ticket", en: "Buy parking ticket" },
  "park.max": { de: "max.", it: "max", en: "max" },
  "park.vehicle": { de: "Fahrzeug (Kennzeichen ist Pflicht)", it: "Veicolo (targa obbligatoria)", en: "Vehicle (plate required)" },
  "park.platePlaceholder": { de: "z. B. W 123 AB", it: "es. MI 123 AB", en: "e.g. AB 123 CD" },
  "park.otherPlate": { de: "+ Anderes Kennzeichen", it: "+ Altra targa", en: "+ Different plate" },
  "park.savedVehicle": { de: "← Gespeichertes Fahrzeug wählen", it: "← Scegli un veicolo salvato", en: "← Choose a saved vehicle" },
  "park.duration": { de: "Parkdauer", it: "Durata della sosta", en: "Parking duration" },
  "park.until": { de: "bis {t}", it: "fino alle {t}", en: "until {t}" },
  "park.less": { de: "15 Minuten weniger", it: "15 minuti in meno", en: "15 minutes less" },
  "park.more": { de: "15 Minuten mehr", it: "15 minuti in più", en: "15 minutes more" },
  "park.payment": { de: "Zahlungsmethode", it: "Metodo di pagamento", en: "Payment method" },
  "park.otherPayment": { de: "+ Andere Zahlungsmethode", it: "+ Altro metodo di pagamento", en: "+ Different payment method" },
  "park.buy": { de: "Jetzt kaufen · {p}", it: "Acquista ora · {p}", en: "Buy now · {p}" },
  "park.buying": { de: "Wird gebucht…", it: "Acquisto in corso…", en: "Purchasing…" },
  "park.demoNote": {
    de: "Demo-Zahlung – es wird nichts abgebucht. Bei vorzeitigem Stopp zahlst du nur die genutzte Zeit.",
    it: "Pagamento demo – non viene addebitato nulla. Se interrompi prima, paghi solo il tempo utilizzato.",
    en: "Demo payment – nothing is charged. Stop early and you only pay for the time used.",
  },
  "park.plateFirst": {
    de: "Bitte gib dein Kennzeichen ein – ohne Kennzeichen kein Parkschein.",
    it: "Inserisci la targa – senza targa non è possibile acquistare il ticket.",
    en: "Please enter your plate – no ticket without a plate.",
  },
  "park.pickVehicle": { de: "Bitte wähle ein Fahrzeug mit Kennzeichen aus.", it: "Seleziona un veicolo con targa.", en: "Please choose a vehicle with a plate." },
  "park.pickPayment": { de: "Bitte wähle eine Zahlungsmethode aus.", it: "Seleziona un metodo di pagamento.", en: "Please choose a payment method." },
  "wheel.hint": { de: "🎡 Am Rad drehen · 1 Umdrehung = 2 h", it: "🎡 Gira la ruota · 1 giro = 2 h", en: "🎡 Spin the wheel · 1 turn = 2 h" },
  "wheel.label": { de: "Parkdauer", it: "Durata della sosta", en: "Parking duration" },

  // auth
  "auth.welcome": { de: "Willkommen zurück 👋", it: "Bentornato 👋", en: "Welcome back 👋" },
  "auth.create": { de: "Konto erstellen", it: "Crea un account", en: "Create account" },
  "auth.login": { de: "Anmelden", it: "Accedi", en: "Sign in" },
  "auth.register": { de: "Registrieren", it: "Registrati", en: "Register" },
  "auth.name": { de: "Dein Name", it: "Il tuo nome", en: "Your name" },
  "auth.email": { de: "E-Mail-Adresse", it: "Indirizzo e-mail", en: "Email address" },
  "auth.password": { de: "Passwort", it: "Password", en: "Password" },
  "auth.passwordNew": { de: "Passwort (min. 8 Zeichen)", it: "Password (min. 8 caratteri)", en: "Password (min. 8 characters)" },
  "auth.busy": { de: "Einen Moment…", it: "Un attimo…", en: "One moment…" },
  "auth.plateNote": {
    de: "Dein Kennzeichen kannst du nach der Anmeldung hinterlegen – es ist Pflicht für den Parkschein-Kauf.",
    it: "Potrai salvare la targa dopo l'accesso – è obbligatoria per acquistare il ticket.",
    en: "You can add your plate after signing in – it's required to buy a ticket.",
  },

  // tickets
  "ticket.bought": { de: "Parkschein aktiv für {p} – gute Fahrt! 🅿️", it: "Ticket attivo per {p} – buon viaggio! 🅿️", en: "Ticket active for {p} – drive safe! 🅿️" },
  "ticket.stop": { de: "Stoppen ({p})", it: "Termina ({p})", en: "Stop ({p})" },
  "ticket.extend": { de: "+30 min", it: "+30 min", en: "+30 min" },

  // drawer
  "drawer.guest": { de: "Gast", it: "Ospite", en: "Guest" },
  "drawer.notLoggedIn": { de: "Nicht angemeldet", it: "Non connesso", en: "Not signed in" },
  "drawer.account": { de: "Konto", it: "Account", en: "Account" },
  "drawer.loginRegister": { de: "Anmelden / Registrieren", it: "Accedi / Registrati", en: "Sign in / Register" },
  "drawer.activeTickets": { de: "Aktive Parkscheine", it: "Ticket attivi", en: "Active tickets" },
  "drawer.noActive": { de: "Kein aktiver Parkschein.", it: "Nessun ticket attivo.", en: "No active ticket." },
  "drawer.vehicles": { de: "Fahrzeuge & Kennzeichen", it: "Veicoli e targhe", en: "Vehicles & plates" },
  "drawer.plate": { de: "Kennzeichen", it: "Targa", en: "Plate" },
  "drawer.payments": { de: "Zahlungsmethoden", it: "Metodi di pagamento", en: "Payment methods" },
  "drawer.addPayment": { de: "+ Zahlungsmethode hinzufügen", it: "+ Aggiungi metodo di pagamento", en: "+ Add payment method" },
  "drawer.history": { de: "Verlauf", it: "Cronologia", en: "History" },
  "drawer.noTickets": { de: "Noch keine Parkscheine.", it: "Ancora nessun ticket.", en: "No tickets yet." },
  "drawer.location": { de: "Standort", it: "Posizione", en: "Location" },
  "drawer.locOn": { de: "Ortung aktiv – du wirst auf der Karte angezeigt.", it: "Localizzazione attiva – sei visibile sulla mappa.", en: "Location on – you're shown on the map." },
  "drawer.locOff": { de: "Ortung ist deaktiviert.", it: "Localizzazione disattivata.", en: "Location is off." },
  "drawer.activate": { de: "Aktivieren", it: "Attiva", en: "Enable" },
  "drawer.legal": { de: "Rechtliches / Legale", it: "Informazioni legali", en: "Legal" },
  "drawer.logout": { de: "Abmelden", it: "Esci", en: "Sign out" },
  "drawer.language": { de: "Sprache", it: "Lingua", en: "Language" },
  "drawer.appearance": { de: "Darstellung", it: "Aspetto", en: "Appearance" },
  "drawer.dark": { de: "🌙 Dunkel", it: "🌙 Scuro", en: "🌙 Dark" },
  "drawer.light": { de: "☀️ Hell", it: "☀️ Chiaro", en: "☀️ Light" },
  "drawer.install": {
    de: "ParkPilot · PWA – über das Browser-Menü „Zum Startbildschirm hinzufügen“ installieren 📲",
    it: "ParkPilot · PWA – installala dal menu del browser con «Aggiungi alla schermata Home» 📲",
    en: "ParkPilot · PWA – install via the browser menu “Add to Home Screen” 📲",
  },
  "drawer.close": { de: "Schließen", it: "Chiudi", en: "Close" },
  "drawer.delete": { de: "Löschen", it: "Elimina", en: "Delete" },

  // location prompt
  "locprompt.title": { de: "Standort aktivieren 📍", it: "Attiva la posizione 📍", en: "Enable location 📍" },
  "locprompt.body": {
    de: "Damit ParkPilot dich auf der Karte anzeigen und die Parkzonen in deiner Nähe finden kann, brauchen wir Zugriff auf deinen Standort. Dein Standort wird nur auf deinem Gerät verwendet und nicht auf unseren Servern gespeichert.",
    it: "Perché ParkPilot possa mostrarti sulla mappa e trovare le zone di sosta vicino a te, serve l'accesso alla tua posizione. La posizione viene usata solo sul tuo dispositivo e non viene salvata sui nostri server.",
    en: "For ParkPilot to show you on the map and find parking zones near you, it needs access to your location. Your location is only used on your device and never stored on our servers.",
  },
  "locprompt.activate": { de: "Standort aktivieren", it: "Attiva la posizione", en: "Enable location" },
  "locprompt.later": { de: "Später", it: "Più tardi", en: "Later" },

  // payments
  "pay.card": { de: "💳 Karte", it: "💳 Carta", en: "💳 Card" },
  "pay.cardNumber": { de: "Kartennummer", it: "Numero carta", en: "Card number" },
  "pay.expiry": { de: "MM/JJ", it: "MM/AA", en: "MM/YY" },
  "pay.saveCard": { de: "Karte speichern", it: "Salva carta", en: "Save card" },
  "pay.ppEmail": { de: "PayPal-E-Mail", it: "E-mail PayPal", en: "PayPal email" },
  "pay.other": { de: "← Andere Zahlungsart", it: "← Altro metodo", en: "← Other method" },
  "pay.cancel": { de: "Abbrechen", it: "Annulla", en: "Cancel" },
  "pay.default": { de: "Standard", it: "Predefinito", en: "Default" },
  "pay.makeDefault": { de: "Als Standard", it: "Predefinito", en: "Make default" },
  "pay.demoNote": {
    de: "Demo-Modus: Es wird nichts abgebucht. Bei Karten werden nur Marke und letzte 4 Ziffern gespeichert.",
    it: "Modalità demo: non viene addebitato nulla. Delle carte salviamo solo circuito e ultime 4 cifre.",
    en: "Demo mode: nothing is charged. For cards only the brand and last 4 digits are stored.",
  },
  "pay.cardLabel": { de: "Karte", it: "Carta", en: "Card" },

  // API error codes
  "err.unauthorized": { de: "Bitte melde dich an.", it: "Effettua l'accesso.", en: "Please sign in." },
  "err.server": { de: "Serverfehler – bitte später erneut versuchen.", it: "Errore del server – riprova più tardi.", en: "Server error – please try again later." },
  "err.invalid_email": { de: "Bitte gib eine gültige E-Mail-Adresse an.", it: "Inserisci un indirizzo e-mail valido.", en: "Please enter a valid email address." },
  "err.name_short": { de: "Bitte gib deinen Namen an.", it: "Inserisci il tuo nome.", en: "Please enter your name." },
  "err.password_short": { de: "Das Passwort braucht mindestens 8 Zeichen.", it: "La password deve avere almeno 8 caratteri.", en: "The password needs at least 8 characters." },
  "err.email_exists": { de: "Für diese E-Mail existiert bereits ein Konto.", it: "Esiste già un account con questa e-mail.", en: "An account with this email already exists." },
  "err.bad_credentials": { de: "E-Mail oder Passwort ist falsch.", it: "E-mail o password errati.", en: "Wrong email or password." },
  "err.invalid_plate": { de: "Ungültiges Kennzeichen (2–12 Zeichen, Buchstaben/Ziffern).", it: "Targa non valida (2–12 caratteri, lettere/cifre).", en: "Invalid plate (2–12 characters, letters/digits)." },
  "err.plate_exists": { de: "Dieses Kennzeichen ist bereits gespeichert.", it: "Questa targa è già salvata.", en: "This plate is already saved." },
  "err.vehicle_has_ticket": { de: "Für dieses Fahrzeug läuft gerade ein Parkschein.", it: "C'è un ticket attivo per questo veicolo.", en: "This vehicle has an active ticket." },
  "err.no_zone": { de: "Keine Parkzone ausgewählt.", it: "Nessuna zona selezionata.", en: "No parking zone selected." },
  "err.plate_required": { de: "Ein Fahrzeug mit Kennzeichen ist für den Kauf erforderlich.", it: "Per l'acquisto serve un veicolo con targa.", en: "A vehicle with a plate is required to purchase." },
  "err.payment_required": { de: "Bitte wähle eine Zahlungsmethode.", it: "Seleziona un metodo di pagamento.", en: "Please choose a payment method." },
  "err.invalid_duration": { de: "Parkdauer muss zwischen 15 Minuten und 24 Stunden liegen.", it: "La durata deve essere tra 15 minuti e 24 ore.", en: "Duration must be between 15 minutes and 24 hours." },
  "err.maxstay": { de: "In dieser Zone sind maximal {m} Minuten erlaubt.", it: "In questa zona sono consentiti al massimo {m} minuti.", en: "This zone allows at most {m} minutes." },
  "err.vehicle_not_found": { de: "Fahrzeug nicht gefunden – bitte Kennzeichen anlegen.", it: "Veicolo non trovato – aggiungi una targa.", en: "Vehicle not found – please add a plate." },
  "err.payment_not_found": { de: "Zahlungsmethode nicht gefunden – bitte eine hinzufügen.", it: "Metodo di pagamento non trovato – aggiungine uno.", en: "Payment method not found – please add one." },
  "err.plate_ticket_exists": { de: "Für dieses Kennzeichen läuft bereits ein Parkschein.", it: "C'è già un ticket attivo per questa targa.", en: "There's already an active ticket for this plate." },
  "err.not_active": { de: "Dieser Parkschein ist nicht mehr aktiv.", it: "Questo ticket non è più attivo.", en: "This ticket is no longer active." },
  "err.invalid_card": { de: "Ungültige Kartennummer.", it: "Numero di carta non valido.", en: "Invalid card number." },
  "err.invalid_expiry": { de: "Ablaufdatum bitte als MM/JJ angeben.", it: "Inserisci la scadenza come MM/AA.", en: "Enter the expiry as MM/YY." },
  "err.card_expired": { de: "Diese Karte ist abgelaufen.", it: "Questa carta è scaduta.", en: "This card has expired." },
  "err.invalid_paypal": { de: "Bitte gib deine PayPal-E-Mail an.", it: "Inserisci la tua e-mail PayPal.", en: "Please enter your PayPal email." },
};

const LOCALES: Record<Lang, string> = { de: "de-AT", it: "it-IT", en: "en-GB" };
export const LANG_NAMES: Record<Lang, string> = { de: "Deutsch", it: "Italiano", en: "English" };
export const LANG_FLAGS: Record<Lang, string> = { de: "🇩🇪", it: "🇮🇹", en: "🇬🇧" };

type I18n = {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** translate an API error thrown by api() */
  terr: (err: unknown) => string;
};

const I18nContext = createContext<I18n | null>(null);

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem("pp_lang");
    if (stored === "de" || stored === "it" || stored === "en") return stored;
    const nav = navigator.language.slice(0, 2);
    if (nav === "de" || nav === "it") return nav;
  } catch {
    /* SSR / privacy mode */
  }
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pp_lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let s = DICT[key]?.[lang] ?? DICT[key]?.en ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
      }
      return s;
    },
    [lang]
  );

  const terr = useCallback(
    (err: unknown) => {
      const e = err as { code?: string; params?: Record<string, string | number>; message?: string };
      if (e?.code && DICT[`err.${e.code}`]) return t(`err.${e.code}`, e.params);
      return e?.message ?? t("err.server");
    },
    [t]
  );

  return (
    <I18nContext.Provider value={{ lang, locale: LOCALES[lang], setLang, t, terr }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
