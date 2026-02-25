import { listActorMovies } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { parseMovieFilters } from "@/lib/query-params";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ actorSlug: string }> },
) {
  try {
    const { actorSlug } = await context.params;
    const filters = parseMovieFilters(request.nextUrl.searchParams);
    const movies = await listActorMovies(actorSlug, filters);
    return NextResponse.json({ movies });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch actor movies", 500);
  }
}
