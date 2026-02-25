import { listFeaturedActors } from "@/lib/data/queries";
import { jsonError, requireCronSecret } from "@/lib/http";
import { syncActorMovies } from "@/lib/sync/actor-sync";

import { NextRequest, NextResponse } from "next/server";

async function runDailySync(request: NextRequest) {
  try {
    if (!requireCronSecret(request)) {
      return jsonError("Unauthorized", 401);
    }

    const actors = await listFeaturedActors();
    const results = [];

    for (const actor of actors) {
      const result = await syncActorMovies(actor.slug);
      results.push(result);
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Daily sync failed", 500);
  }
}

export async function GET(request: NextRequest) {
  return runDailySync(request);
}

export async function POST(request: NextRequest) {
  return runDailySync(request);
}
