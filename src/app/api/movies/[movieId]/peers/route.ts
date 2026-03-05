import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAlsoMovingFilms, getComparableFilms } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { optionalLimitQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const { limit } = optionalLimitQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const safeLimit = limit ?? 10;
    const [comparable, alsoMoving] = await Promise.all([
      getComparableFilms(movieId, safeLimit),
      getAlsoMovingFilms(movieId, safeLimit),
    ]);

    return NextResponse.json({
      movieId,
      comparable,
      alsoMoving,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie peers", 500);
  }
}

