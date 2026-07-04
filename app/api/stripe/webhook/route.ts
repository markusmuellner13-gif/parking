import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Stripe calls this after a successful Checkout payment → activate the ticket. */
export async function POST(req: NextRequest) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe] webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const ticketId = session.metadata?.ticketId;
    const minutes = parseInt(session.metadata?.minutes ?? "", 10);
    if (ticketId && isFinite(minutes)) {
      try {
        const c = await db();
        const res = await c.execute({
          sql: "SELECT id, status FROM tickets WHERE id = ?",
          args: [ticketId],
        });
        const row = res.rows[0];
        // idempotent: only activate tickets still waiting for payment
        if (row && String(row.status) === "pending") {
          const now = Date.now();
          await c.execute({
            sql: `UPDATE tickets SET status = 'active', start_at = ?, end_at = ?, payment_label = ? WHERE id = ?`,
            args: [now, now + minutes * 60_000, "Stripe", ticketId],
          });
        }
      } catch (err) {
        console.error("[stripe] failed to activate ticket", err);
        return NextResponse.json({ error: "db error" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
