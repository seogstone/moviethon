import { getMovieById } from "@/lib/data/queries";
import { getCurrentAppUser } from "@/lib/auth/user";
import { getLatestMovieIndexSnapshot, getMovieIndexHistory } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";

import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const appUser = await getCurrentAppUser({ upsert: false });
    const movie = await getMovieById(movieId, appUser?.id ?? null);

    if (!movie) {
      return jsonError("Movie not found", 404);
    }

    const [indexSnapshot, trend] = await Promise.all([
      getLatestMovieIndexSnapshot(movieId),
      getMovieIndexHistory(movieId, 30),
    ]);

    return NextResponse.json({
      movie: {
        ...movie,
        indexCurrent: indexSnapshot?.indexValue ?? null,
        indexDelta1d: indexSnapshot?.delta1d ?? null,
        indexDelta7d: indexSnapshot?.delta7d ?? null,
        indexDelta30d: indexSnapshot?.delta30d ?? null,
        rankPosition: indexSnapshot?.rankPosition ?? null,
        rankChange1d: indexSnapshot?.rankChange1d ?? null,
        volatility: indexSnapshot?.volatilityClass ?? "insufficient",
        indexTrend: trend
          .slice()
          .reverse()
          .map((point) => ({ date: point.asOfDate, value: point.indexValue })),
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie", 500);
  }
}
