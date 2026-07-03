import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { handleError } from "@/lib/api";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
