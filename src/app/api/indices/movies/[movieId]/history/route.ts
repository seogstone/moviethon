import { getMovieIndexHistory } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { indexHistoryQuerySchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const query = indexHistoryQuerySchema.parse({
      days: request.nextUrl.searchParams.get("days") ?? undefined,
    });

    const history = await getMovieIndexHistory(movieId, query.days ?? 30);
    return NextResponse.json({ movieId, history });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie index history", 500);
  }
}
