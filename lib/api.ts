import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown): NextResponse {
  const status = (err as { status?: number })?.status;
  if (status === 401) return jsonError("Bitte melde dich an.", 401);
  console.error("[api]", err);
  return jsonError("Serverfehler – bitte später erneut versuchen.", 500);
}
