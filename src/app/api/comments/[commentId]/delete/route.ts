import { getCommentWithDeleteHash, softDeleteComment } from "@/lib/data/queries";
import { sha256 } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { verifyDeleteToken } from "@/lib/security/delete-token";
import { commentDeleteSchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const payload = commentDeleteSchema.parse(await request.json());

    if (!verifyDeleteToken(payload.token, commentId)) {
      return jsonError("Invalid or expired delete token", 403);
    }

    const comment = await getCommentWithDeleteHash(commentId);
    if (!comment) {
      return jsonError("Comment not found", 404);
    }

    if (comment.status === "deleted") {
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    const incomingHash = sha256(payload.token);
    if (incomingHash !== comment.delete_token_hash) {
      return jsonError("Delete token does not match this comment", 403);
    }

    await softDeleteComment(commentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Comment delete failed", 400);
  }
}
