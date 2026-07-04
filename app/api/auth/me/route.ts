import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isPersistent } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe";
import { handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json({ user, persistentDb: isPersistent(), stripeEnabled: stripeEnabled() });
  } catch (err) {
    return handleError(err);
  }
}
