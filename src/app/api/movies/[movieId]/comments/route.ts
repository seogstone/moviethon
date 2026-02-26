import { createComment, listMovieComments } from "@/lib/data/queries";
import { getCurrentAppUser } from "@/lib/auth/user";
import { jsonError } from "@/lib/http";
import { createDeleteToken } from "@/lib/security/delete-token";
import { verifyCaptcha } from "@/lib/security/captcha";
import { buildGuestContext, parseCookieHeader } from "@/lib/security/guest";
import { containsBlockedLanguage, sanitizeCommentBody } from "@/lib/security/moderation";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { commentPayloadSchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "20") || 20));

    const result = await listMovieComments(movieId, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load comments", 400);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const payload = commentPayloadSchema.parse(await request.json());
    const appUser = await getCurrentAppUser();

    const cookieStore = parseCookieHeader(request.headers.get("cookie"));
    const guest = buildGuestContext(cookieStore, request.headers);

    const captchaOk = await verifyCaptcha(payload.captchaToken, guest.ipAddress);
    if (!captchaOk) {
      return jsonError("Captcha verification failed", 400);
    }

    const writeRate = await enforceRateLimit({
      scope: `comment:${movieId}`,
      identity: appUser ? `${appUser.id}:${movieId}` : `${guest.fingerprintHash}:${movieId}`,
      limit: 6,
      windowSeconds: 60,
    });

    if (!writeRate.allowed) {
      return jsonError(`Too many comments. Try again in ${writeRate.retryAfterSeconds}s`, 429);
    }

    if (!appUser && !payload.displayName?.trim()) {
      return jsonError("Display name is required for guest comments", 400);
    }

    const cleanedBody = sanitizeCommentBody(payload.body);
    if (containsBlockedLanguage(cleanedBody)) {
      return jsonError("Comment blocked by moderation policy", 400);
    }

    const commentId = randomUUID();
    const finalToken = createDeleteToken(commentId);
    const comment = await createComment({
      commentId,
      movieId,
      displayName: (payload.displayName?.trim() || appUser?.displayName || appUser?.name || "").trim() || "member",
      body: cleanedBody,
      deleteTokenHash: finalToken.tokenHash,
      userId: appUser?.id ?? null,
    });

    const response = NextResponse.json({
      comment,
      deleteToken: finalToken.token,
    });

    if (!appUser && guest.setCookieHeader) {
      response.headers.set("set-cookie", guest.setCookieHeader);
    }

    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to post comment", 400);
  }
}
