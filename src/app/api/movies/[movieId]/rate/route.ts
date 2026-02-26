import { getMovieById, upsertUserVote } from "@/lib/data/queries";
import { getCurrentAppUser } from "@/lib/auth/user";
import { sha256 } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { normalizeScore } from "@/lib/ratings";
import { verifyCaptcha } from "@/lib/security/captcha";
import { getIpAddress } from "@/lib/security/guest";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { ratingPayloadSchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await context.params;
    const payload = ratingPayloadSchema.parse(await request.json());
    const appUser = await getCurrentAppUser();

    if (!appUser) {
      return jsonError("Login required to rate movies", 401);
    }

    const ipAddress = getIpAddress(request.headers);
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const ipHash = sha256(ipAddress);
    const fingerprintHash = sha256(`${ipAddress}:${userAgent}`);

    const captchaOk = await verifyCaptcha(payload.captchaToken, ipAddress);
    if (!captchaOk) {
      return jsonError("Captcha verification failed", 400);
    }

    const writeRate = await enforceRateLimit({
      scope: `rate:${movieId}`,
      identity: `${appUser.id}:${movieId}:${fingerprintHash}`,
      limit: 12,
      windowSeconds: 60,
    });

    if (!writeRate.allowed) {
      return jsonError(`Too many rating requests. Try again in ${writeRate.retryAfterSeconds}s`, 429);
    }

    const ipCooldown = await enforceRateLimit({
      scope: `rate-ip:${movieId}`,
      identity: `${ipHash}:${movieId}`,
      limit: 20,
      windowSeconds: 3600,
    });

    if (!ipCooldown.allowed) {
      return jsonError("IP cooldown reached for this movie. Try again later.", 429);
    }

    await upsertUserVote({
      movieId,
      userId: appUser.id,
      score: normalizeScore(payload.score),
    });

    const movie = await getMovieById(movieId, appUser.id);
    if (!movie) {
      return jsonError("Movie not found", 404);
    }

    return NextResponse.json({
      ok: true,
      communityAvg: movie.ratings.communityAvg,
      communityCount: movie.ratings.communityCount,
      myRating: movie.ratings.myRating ?? null,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Rating failed", 400);
  }
}
