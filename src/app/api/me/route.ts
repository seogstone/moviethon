import { getCurrentAppUser } from "@/lib/auth/user";
import { getUserContributionSummary } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return jsonError("Unauthorized", 401);
    }

    const summary = await getUserContributionSummary(appUser.id);
    return NextResponse.json({ user: appUser, summary });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load profile", 500);
  }
}
