import { getLatestActorRankings } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { rankingQuerySchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const query = rankingQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      offset: request.nextUrl.searchParams.get("offset") ?? undefined,
      sortBy: request.nextUrl.searchParams.get("sortBy") ?? undefined,
      sortDir: request.nextUrl.searchParams.get("sortDir") ?? undefined,
    });

    const payload = await getLatestActorRankings(query);
    return NextResponse.json({
      ...payload,
      lastUpdated: payload.asOfDate,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch actor rankings", 500);
  }
}
