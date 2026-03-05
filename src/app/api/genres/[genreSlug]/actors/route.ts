import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getGenreActorExposure } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { optionalLimitQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ genreSlug: string }> },
) {
  try {
    const { genreSlug } = await context.params;
    const { limit } = optionalLimitQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const rows = await getGenreActorExposure(genreSlug, limit ?? 12);
    return NextResponse.json({ items: rows });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch genre actors", 500);
  }
}

