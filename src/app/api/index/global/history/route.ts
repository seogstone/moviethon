import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getGlobalIndexHistory } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { globalHistoryQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const parsed = globalHistoryQuerySchema.parse({
      days: request.nextUrl.searchParams.get("days") ?? undefined,
    });

    const days = parsed.days === "all" ? Number.POSITIVE_INFINITY : parsed.days ?? 30;
    const history = await getGlobalIndexHistory(days);

    return NextResponse.json({
      days: parsed.days ?? 30,
      items: history.slice().reverse(),
      availableDays: history.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch global history", 500);
  }
}

