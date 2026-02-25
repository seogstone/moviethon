import { listFeaturedActors } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const actors = await listFeaturedActors(search);
    return NextResponse.json({ actors });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch actors", 500);
  }
}
