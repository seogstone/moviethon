import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getActorInstrumentPanel, getComparableActors } from "@/lib/data/index-queries";
import { getActorBySlug } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { optionalLimitQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ actorSlug: string }> },
) {
  try {
    const { actorSlug } = await context.params;
    const actor = await getActorBySlug(actorSlug);
    if (!actor) {
      return jsonError("Actor not found", 404);
    }

    const { limit } = optionalLimitQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const payload = await getActorInstrumentPanel(actor.id);
    if (!payload) {
      return jsonError("Actor analytics not found", 404);
    }

    const peerLimit = limit ?? 10;
    const peers = await getComparableActors(actor.id, peerLimit);
    return NextResponse.json({
      ...payload,
      peers,
      lastUpdated: payload.trend.at(-1)?.date ?? null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch actor analytics", 500);
  }
}

