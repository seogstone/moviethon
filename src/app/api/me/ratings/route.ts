import { getCurrentAppUser } from "@/lib/auth/user";
import { listRatingsByUser } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return jsonError("Unauthorized", 401);
    }

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "20") || 20));
    const payload = await listRatingsByUser(appUser.id, page, pageSize);

    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load ratings", 500);
  }
}
