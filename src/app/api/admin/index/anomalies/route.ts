import { getIndexAnomalies } from "@/lib/data/index-queries";
import { jsonError, requireAdmin } from "@/lib/http";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return jsonError("Unauthorized", 401);
    }

    const rawLimit = request.nextUrl.searchParams.get("limit");
    const limit = rawLimit ? Math.min(100, Math.max(1, Number(rawLimit) || 30)) : 30;

    const payload = await getIndexAnomalies(limit);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch index anomalies", 500);
  }
}
