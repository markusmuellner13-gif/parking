import { createClient, type Client } from "@libsql/client";

/**
 * Turso (libSQL) database client.
 *
 * Production: set TURSO_DATABASE_URL (libsql://...turso.io) and TURSO_AUTH_TOKEN.
 * Without them the app falls back to a local SQLite file so it stays usable —
 * on serverless that storage is ephemeral (per-instance, wiped on redeploy).
 */

const globalForDb = globalThis as unknown as {
  __ppClient?: Client;
  __ppMigrated?: Promise<void>;
};

function fallbackUrl(): string {
  if (process.env.NODE_ENV === "development") return "file:dev.db";
  return "file:/tmp/parkpilot.db";
}

export function isPersistent(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

function client(): Client {
  if (!globalForDb.__ppClient) {
    globalForDb.__ppClient = createClient({
      url: process.env.TURSO_DATABASE_URL ?? fallbackUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalForDb.__ppClient;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plate TEXT NOT NULL,
    label TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    plate TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    zone_lat REAL,
    zone_lng REAL,
    price_hour_cents INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    start_at INTEGER NOT NULL,
    end_at INTEGER NOT NULL,
    stopped_at INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS overpass_cache (
    cache_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id, created_at)`,
];

async function migrate(): Promise<void> {
  const c = client();
  for (const sql of SCHEMA) {
    await c.execute(sql);
  }
}

export async function db(): Promise<Client> {
  if (!globalForDb.__ppMigrated) {
    globalForDb.__ppMigrated = migrate().catch((err) => {
      globalForDb.__ppMigrated = undefined;
      throw err;
    });
  }
  await globalForDb.__ppMigrated;
  return client();
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
