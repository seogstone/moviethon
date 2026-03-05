import { listFeaturedActors } from "@/lib/data/queries";
import { jsonError, requireCronSecret } from "@/lib/http";
import { runDailyIndexPipeline } from "@/lib/index/run-daily-index";
import { syncActorMovies } from "@/lib/sync/actor-sync";

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

async function runDailySync(request: NextRequest) {
  try {
    if (!requireCronSecret(request)) {
      return jsonError("Unauthorized", 401);
    }

    const mode = request.nextUrl.searchParams.get("mode") ?? "index-only";
    const actorLimitRaw = Number(request.nextUrl.searchParams.get("actorLimit") ?? "0");
    const actorLimit = Number.isFinite(actorLimitRaw) && actorLimitRaw > 0 ? Math.floor(actorLimitRaw) : null;

    const results = [];
    if (mode === "full-sync") {
      const actors = await listFeaturedActors();
      const selectedActors = actorLimit ? actors.slice(0, actorLimit) : actors;
      for (const actor of selectedActors) {
        const result = await syncActorMovies(actor.slug);
        results.push(result);
      }
    }

    const index = await runDailyIndexPipeline();

    return NextResponse.json({
      ok: true,
      mode,
      syncedActors: results.length,
      results,
      index,
    });
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
