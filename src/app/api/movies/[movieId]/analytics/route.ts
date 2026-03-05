import { NextResponse } from "next/server";

import {
  getAlsoMovingFilms,
  getComparableFilms,
  getFilmCommunityVelocity,
  getFilmInstrumentPanel,
  getFilmPerformanceSnapshots,
  getMovieIndexHistory,
} from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const [instrument, history, snapshots, peers, alsoMoving, communityVelocity] = await Promise.all([
      getFilmInstrumentPanel(movieId),
      getMovieIndexHistory(movieId, 90),
      getFilmPerformanceSnapshots(movieId, 1, 20),
      getComparableFilms(movieId, 10),
      getAlsoMovingFilms(movieId, 10),
      getFilmCommunityVelocity(movieId),
    ]);

    if (!instrument) {
      return jsonError("Movie analytics not found", 404);
    }

    return NextResponse.json({
      ...instrument,
      trend: history.slice().reverse().map((point) => ({ date: point.asOfDate, value: point.indexValue })),
      snapshots: snapshots.items,
      snapshotsPage: {
        page: snapshots.page,
        pageSize: snapshots.pageSize,
        total: snapshots.total,
      },
      peers,
      alsoMoving,
      communityVelocity,
      lastUpdated: history[0]?.asOfDate ?? null,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie analytics", 500);
  }
}
