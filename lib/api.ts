import { NextResponse } from "next/server";

export function jsonError(
  message: string,
  status = 400,
  code?: string,
  params?: Record<string, string | number>
): NextResponse {
  return NextResponse.json({ error: message, code, params }, { status });
}

export function handleError(err: unknown): NextResponse {
  const status = (err as { status?: number })?.status;
  if (status === 401) return jsonError("Bitte melde dich an.", 401, "unauthorized");
  console.error("[api]", err);
  return jsonError("Serverfehler – bitte später erneut versuchen.", 500, "server");
}
