import { hideComment } from "@/lib/data/queries";
import { jsonError, requireAdmin } from "@/lib/http";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    if (!requireAdmin(request)) {
      return jsonError("Unauthorized", 401);
    }

    const { commentId } = await context.params;
    await hideComment(commentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to hide comment", 400);
  }
}
