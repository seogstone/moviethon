import { getLatestMoverRankings } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { moverRankingQuerySchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const query = moverRankingQuerySchema.parse({
      type: request.nextUrl.searchParams.get("type") ?? undefined,
      window: request.nextUrl.searchParams.get("window") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      offset: request.nextUrl.searchParams.get("offset") ?? undefined,
    });

    const payload = await getLatestMoverRankings(query);
    return NextResponse.json({
      ...payload,
      lastUpdated: payload.asOfDate,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch mover rankings", 500);
  }
}
