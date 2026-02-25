import { jsonError, requireAdmin } from "@/lib/http";
import { syncActorMovies } from "@/lib/sync/actor-sync";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ actorSlug: string }> },
) {
  try {
    if (!requireAdmin(request)) {
      return jsonError("Unauthorized", 401);
    }

    const { actorSlug } = await context.params;
    const result = await syncActorMovies(actorSlug);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to sync actor", 400);
  }
}
