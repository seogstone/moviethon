import { getIndexHealth } from "@/lib/data/index-queries";
import { jsonError, requireAdmin } from "@/lib/http";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return jsonError("Unauthorized", 401);
    }

    const health = await getIndexHealth();
    return NextResponse.json(health);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch index health", 500);
  }
}
