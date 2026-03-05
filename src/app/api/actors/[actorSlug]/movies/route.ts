import { getActorBySlug, listActorMovies } from "@/lib/data/queries";
import { getActorIndexHistory, getLatestActorIndexSnapshot } from "@/lib/data/index-queries";
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
    const [movies, actor] = await Promise.all([listActorMovies(actorSlug, filters), getActorBySlug(actorSlug)]);
    let actorIndexSnapshot: Awaited<ReturnType<typeof getLatestActorIndexSnapshot>> = null;
    let actorIndexHistory: Awaited<ReturnType<typeof getActorIndexHistory>> = [];

    if (actor) {
      [actorIndexSnapshot, actorIndexHistory] = await Promise.all([
        getLatestActorIndexSnapshot(actor.id),
        getActorIndexHistory(actor.id, 30),
      ]);
    }

    return NextResponse.json({
      movies,
      actorIndexCurrent: actorIndexSnapshot?.indexValue ?? null,
      actorIndexDelta7d: actorIndexSnapshot?.delta7d ?? null,
      actorVolatility: actorIndexSnapshot?.volatilityClass ?? "insufficient",
      actorTrend: actorIndexHistory
        .slice()
        .reverse()
        .map((point) => ({ date: point.asOfDate, value: point.indexValue })),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch actor movies", 500);
  }
}
