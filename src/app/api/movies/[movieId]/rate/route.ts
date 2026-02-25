import { getMovieById, upsertGuestVote } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { normalizeScore } from "@/lib/ratings";
import { verifyCaptcha } from "@/lib/security/captcha";
import { buildGuestContext, parseCookieHeader } from "@/lib/security/guest";
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

    const cookieStore = parseCookieHeader(request.headers.get("cookie"));
    const guest = buildGuestContext(cookieStore, request.headers);

    const captchaOk = await verifyCaptcha(payload.captchaToken, guest.ipAddress);
    if (!captchaOk) {
      return jsonError("Captcha verification failed", 400);
    }

    const writeRate = await enforceRateLimit({
      scope: `rate:${movieId}`,
      identity: `${guest.fingerprintHash}:${movieId}`,
      limit: 12,
      windowSeconds: 60,
    });

    if (!writeRate.allowed) {
      return jsonError(`Too many rating requests. Try again in ${writeRate.retryAfterSeconds}s`, 429);
    }

    const ipCooldown = await enforceRateLimit({
      scope: `rate-ip:${movieId}`,
      identity: `${guest.ipHash}:${movieId}`,
      limit: 20,
      windowSeconds: 3600,
    });

    if (!ipCooldown.allowed) {
      return jsonError("IP cooldown reached for this movie. Try again later.", 429);
    }

    await upsertGuestVote({
      movieId,
      guestKeyHash: guest.guestKeyHash,
      ipHash: guest.ipHash,
      score: normalizeScore(payload.score),
    });

    const movie = await getMovieById(movieId);
    if (!movie) {
      return jsonError("Movie not found", 404);
    }

    const response = NextResponse.json({
      ok: true,
      communityAvg: movie.ratings.communityAvg,
      communityCount: movie.ratings.communityCount,
    });

    if (guest.setCookieHeader) {
      response.headers.set("set-cookie", guest.setCookieHeader);
    }

    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Rating failed", 400);
  }
}
