import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getGenreHistory } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { globalHistoryQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ genreSlug: string }> },
) {
  try {
    const { genreSlug } = await context.params;
    const { days } = globalHistoryQuerySchema.parse({
      days: request.nextUrl.searchParams.get("days") ?? undefined,
    });

    const safeDays = days === "all" ? 3650 : days ?? 30;
    const rows = await getGenreHistory(genreSlug, safeDays);

    return NextResponse.json({
      days: days ?? 30,
      availableDays: rows.length,
      items: rows.slice().reverse(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch genre history", 500);
  }
}

