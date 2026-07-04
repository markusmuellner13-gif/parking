import Stripe from "stripe";

/**
 * Real payments via Stripe Checkout, activated by setting env vars
 * (locally in .env, on Vercel under Project → Settings → Environment Variables):
 *
 *   STRIPE_SECRET_KEY      = sk_live_... (or sk_test_... to try it out)
 *   STRIPE_WEBHOOK_SECRET  = whsec_...   (from the webhook endpoint below)
 *
 * Webhook to create in the Stripe dashboard (Developers → Webhooks):
 *   URL:    https://<your-domain>/api/stripe/webhook
 *   Event:  checkout.session.completed
 *
 * Without the env vars the app keeps its demo payment vault.
 * Checkout automatically offers cards, Apple Pay, Google Pay and PayPal
 * (enable PayPal in Stripe dashboard → Payment methods).
 */

const globalForStripe = globalThis as unknown as { __ppStripe?: Stripe };

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  if (!globalForStripe.__ppStripe) {
    globalForStripe.__ppStripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return globalForStripe.__ppStripe;
}
