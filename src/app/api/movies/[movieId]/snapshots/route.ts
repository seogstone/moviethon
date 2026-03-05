import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getFilmPerformanceSnapshots } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { paginationQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const { page, pageSize } = paginationQuerySchema.parse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
    });

    const result = await getFilmPerformanceSnapshots(movieId, page ?? 1, pageSize ?? 20);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie snapshots", 500);
  }
}

