import { getMovieById } from "@/lib/data/queries";
import { getCurrentAppUser } from "@/lib/auth/user";
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

    return NextResponse.json({ movie });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie", 500);
  }
}
