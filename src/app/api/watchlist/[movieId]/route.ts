import { getCurrentAppUser } from "@/lib/auth/user";
import { addMovieToWatchlist, removeMovieFromWatchlist } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return jsonError("Login required for watchlist", 401);
    }

    await addMovieToWatchlist(appUser.id, movieId);
    return NextResponse.json({ ok: true, inWatchlist: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to add watchlist item", 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return jsonError("Login required for watchlist", 401);
    }

    await removeMovieFromWatchlist(appUser.id, movieId);
    return NextResponse.json({ ok: true, inWatchlist: false });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to remove watchlist item", 400);
  }
}
