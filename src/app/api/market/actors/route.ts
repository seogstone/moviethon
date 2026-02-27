import { getHomepageMarketStats } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { marketActorsQuerySchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const parsed = marketActorsQuerySchema.parse({
      scope: request.nextUrl.searchParams.get("scope") ?? undefined,
      windowDays: request.nextUrl.searchParams.get("windowDays") ?? undefined,
      sparkDays: request.nextUrl.searchParams.get("sparkDays") ?? undefined,
      minVotesForDelta: request.nextUrl.searchParams.get("minVotesForDelta") ?? undefined,
    });

    const payload = await getHomepageMarketStats({
      actorScope: parsed.scope,
      windowDays: parsed.windowDays,
      sparkDays: parsed.sparkDays,
      minVotesForDelta: parsed.minVotesForDelta,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch market data", 500);
  }
}
