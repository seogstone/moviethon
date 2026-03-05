import { NextResponse } from "next/server";

import { getGenreInstrumentPanel } from "@/lib/data/index-queries";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ genreSlug: string }> },
) {
  try {
    const { genreSlug } = await context.params;
    const payload = await getGenreInstrumentPanel(genreSlug);
    if (!payload) {
      return jsonError("Genre not found", 404);
    }

    return NextResponse.json({
      ...payload,
      lastUpdated: payload.trend.at(-1)?.date ?? null,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch genre analytics", 500);
  }
}

