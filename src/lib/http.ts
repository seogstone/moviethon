import { readEnv } from "@/lib/env";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function requireAdmin(request: NextRequest): boolean {
  const fromHeader = request.headers.get("x-admin-token");
  const expected = readEnv("ADMIN_API_TOKEN");
  return Boolean(fromHeader && fromHeader === expected);
}

export function requireCronSecret(request: NextRequest): boolean {
  const fromHeader = request.headers.get("x-cron-secret");
  const expected = readEnv("CRON_SECRET");
  return Boolean(fromHeader && fromHeader === expected);
}
