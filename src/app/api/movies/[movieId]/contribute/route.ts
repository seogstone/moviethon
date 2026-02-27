import { getCurrentAppUser } from "@/lib/auth/user";
import { sha256 } from "@/lib/crypto";
import { createComment, getMovieById, upsertUserVote } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { normalizeScore } from "@/lib/ratings";
import { verifyCaptcha } from "@/lib/security/captcha";
import { createDeleteToken } from "@/lib/security/delete-token";
import { buildGuestContext, getIpAddress, parseCookieHeader } from "@/lib/security/guest";
import { containsBlockedLanguage, sanitizeCommentBody } from "@/lib/security/moderation";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { contributionPayloadSchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const payload = contributionPayloadSchema.parse(await request.json());
    const appUser = await getCurrentAppUser();

    const cookieStore = parseCookieHeader(request.headers.get("cookie"));
    const guest = buildGuestContext(cookieStore, request.headers);
    const ipAddress = getIpAddress(request.headers);
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    const commentBody = payload.body?.trim() ?? "";
    const wantsComment = commentBody.length > 0;
    const wantsRating = typeof payload.score === "number";

    if (!wantsComment && !wantsRating) {
      return jsonError("Add a comment or change your rating before submitting.", 400);
    }

    const captchaOk = await verifyCaptcha(payload.captchaToken, guest.ipAddress);
    if (!captchaOk) {
      return jsonError("Captcha verification failed", 400);
    }

    const notices: string[] = [];
    const errors: string[] = [];
    let postedComment = null;
    let deleteToken: string | null = null;
    let ratingSaved = false;
    let commentPosted = false;

    if (wantsRating) {
      const ratingScore = payload.score;
      if (!appUser) {
        errors.push("Login required to rate movies.");
      } else if (typeof ratingScore !== "number") {
        errors.push("Invalid rating score.");
      } else {
        const ipHash = sha256(ipAddress);
        const fingerprintHash = sha256(`${ipAddress}:${userAgent}`);

        const writeRate = await enforceRateLimit({
          scope: `rate:${movieId}`,
          identity: `${appUser.id}:${movieId}:${fingerprintHash}`,
          limit: 12,
          windowSeconds: 60,
        });

        if (!writeRate.allowed) {
          errors.push(`Too many rating requests. Try again in ${writeRate.retryAfterSeconds}s.`);
        } else {
          const ipCooldown = await enforceRateLimit({
            scope: `rate-ip:${movieId}`,
            identity: `${ipHash}:${movieId}`,
            limit: 20,
            windowSeconds: 3600,
          });

          if (!ipCooldown.allowed) {
            errors.push("IP cooldown reached for this movie. Try again later.");
          } else {
            await upsertUserVote({
              movieId,
              userId: appUser.id,
              score: normalizeScore(ratingScore),
            });
            notices.push("Rating saved.");
            ratingSaved = true;
          }
        }
      }
    }

    if (wantsComment) {
      const writeRate = await enforceRateLimit({
        scope: `comment:${movieId}`,
        identity: appUser ? `${appUser.id}:${movieId}` : `${guest.fingerprintHash}:${movieId}`,
        limit: 6,
        windowSeconds: 60,
      });

      if (!writeRate.allowed) {
        errors.push(`Too many comments. Try again in ${writeRate.retryAfterSeconds}s.`);
      } else if (!appUser && !payload.displayName?.trim()) {
        errors.push("Display name is required for guest comments.");
      } else {
        const cleanedBody = sanitizeCommentBody(commentBody);
        if (containsBlockedLanguage(cleanedBody)) {
          errors.push("Comment blocked by moderation policy.");
        } else {
          const commentId = randomUUID();
          const finalToken = createDeleteToken(commentId);

          postedComment = await createComment({
            commentId,
            movieId,
            displayName:
              (payload.displayName?.trim() || appUser?.displayName || appUser?.name || "").trim() || "member",
            body: cleanedBody,
            deleteTokenHash: finalToken.tokenHash,
            userId: appUser?.id ?? null,
          });

          deleteToken = finalToken.token;
          notices.push("Comment posted.");
          commentPosted = true;
        }
      }
    }

    if (!ratingSaved && !commentPosted) {
      return NextResponse.json({ error: errors.join(" ") || "Submission failed." }, { status: 400 });
    }

    const movie = await getMovieById(movieId, appUser?.id ?? null);
    if (!movie) {
      return jsonError("Movie not found", 404);
    }

    const response = NextResponse.json({
      ok: true,
      notices,
      errors,
      ratingSaved,
      commentPosted,
      communityAvg: movie.ratings.communityAvg,
      communityCount: movie.ratings.communityCount,
      myRating: movie.ratings.myRating ?? null,
      comment: postedComment,
      deleteToken,
    });

    if (!appUser && guest.setCookieHeader && postedComment) {
      response.headers.set("set-cookie", guest.setCookieHeader);
    }

    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Submission failed", 400);
  }
}
