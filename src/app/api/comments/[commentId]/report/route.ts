import { reportComment } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { buildGuestContext, parseCookieHeader } from "@/lib/security/guest";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { commentReportSchema } from "@/lib/validation";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const payload = commentReportSchema.parse(await request.json());

    const cookieStore = parseCookieHeader(request.headers.get("cookie"));
    const guest = buildGuestContext(cookieStore, request.headers);

    const limit = await enforceRateLimit({
      scope: `report:${commentId}`,
      identity: guest.fingerprintHash,
      limit: 5,
      windowSeconds: 300,
    });

    if (!limit.allowed) {
      return jsonError("Report limit reached. Try again later.", 429);
    }

    await reportComment({
      commentId,
      reason: payload.reason,
      reporterKeyHash: guest.guestKeyHash,
    });

    const response = NextResponse.json({ ok: true });
    if (guest.setCookieHeader) {
      response.headers.set("set-cookie", guest.setCookieHeader);
    }

    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to report comment", 400);
  }
}
