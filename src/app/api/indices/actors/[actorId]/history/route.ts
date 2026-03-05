import { getActorIndexHistory } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";
import { indexHistoryQuerySchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ actorId: string }> },
) {
  try {
    const { actorId } = await context.params;
    const query = indexHistoryQuerySchema.parse({
      days: request.nextUrl.searchParams.get("days") ?? undefined,
    });

    const history = await getActorIndexHistory(actorId, query.days ?? 30);
    return NextResponse.json({ actorId, history });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((issue) => issue.message).join("; "), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to fetch actor index history", 500);
  }
}
