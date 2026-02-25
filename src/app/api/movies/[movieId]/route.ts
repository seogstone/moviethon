import { getMovieById } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";

import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const movie = await getMovieById(movieId);

    if (!movie) {
      return jsonError("Movie not found", 404);
    }

    return NextResponse.json({ movie });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie", 500);
  }
}
