import { NextResponse } from "next/server";
import { db, isPersistent } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database round-trip check. */
export async function GET() {
  const startedAt = Date.now();
  try {
    const c = await db();
    const res = await c.execute("SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM tickets) AS tickets");
    const row = res.rows[0];
    return NextResponse.json({
      status: "ok",
      db: {
        connected: true,
        persistent: isPersistent(),
        latencyMs: Date.now() - startedAt,
        users: Number(row?.users ?? 0),
        tickets: Number(row?.tickets ?? 0),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: { connected: false, persistent: isPersistent() },
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
