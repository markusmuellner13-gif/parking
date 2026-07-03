# 🅿️ ParkPilot — Dein Park-Copilot

An EasyPark-style parking web app (PWA): live map with your position, nearby parking
zones with tariffs and max-stay, user accounts, and digital parking tickets that
require a license plate.

## Features

- 🗺️ **Live map** (Leaflet + CARTO/OSM tiles) that follows your GPS position
- 📡 **Zone scanning**: real parking data from OpenStreetMap (Overpass API) — garages,
  lots and ticket machines with fees, opening hours, capacity and max-stay — plus
  curated short-term-parking tariff zones for Vienna, Graz, Linz, Salzburg and Innsbruck
- 👤 **Accounts**: email + password (scrypt-hashed), 30-day sessions
- 🚗 **Vehicles**: license plate is **mandatory** to purchase a ticket (enforced server-side)
- 🎫 **Tickets**: duration picker with live price, countdown, +30 min extension, and
  fair early-stop billing (you only pay for the minutes used)
- 📲 **PWA**: installable on the phone (manifest + service worker + offline shell)
- 📱 **Responsive**: bottom-sheet UI on phones, sidebar layout on tablet/desktop

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Leaflet ·
**Turso (libSQL)** via `@libsql/client`

## Database (Turso)

Set these environment variables (locally in `.env`, on Vercel under
*Project → Settings → Environment Variables*):

```
TURSO_DATABASE_URL=libsql://<your-db>.turso.io
TURSO_AUTH_TOKEN=<token>
```

Create them with the Turso CLI:

```bash
turso db create parkpilot
turso db show parkpilot --url
turso db tokens create parkpilot
```

The schema is applied automatically on first request. **Without these variables the
app falls back to a local/ephemeral SQLite file** (shown as a “Demo-Speicher” banner
in the UI) so it stays fully testable — data just won’t survive redeploys.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run gen:icons  # regenerate PWA icons (requires sharp)
```

## Notes

- Tariffs of the curated city zones are indicative and marked “geschätzt” — signage
  on site is authoritative.
- Payment is simulated (demo) — no real money moves.
