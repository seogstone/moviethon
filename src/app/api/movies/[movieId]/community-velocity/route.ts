import { NextResponse } from "next/server";

import { getFilmCommunityVelocity } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const payload = await getFilmCommunityVelocity(movieId);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch movie community velocity", 500);
  }
}

