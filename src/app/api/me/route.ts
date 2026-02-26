import { getCurrentAppUser } from "@/lib/auth/user";
import { getUserContributionSummary, updateAppUserProfile } from "@/lib/data/queries";
import { jsonError } from "@/lib/http";
import { userProfileUpdateSchema } from "@/lib/validation";

import { NextRequest } from "next/server";
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

export async function PATCH(request: NextRequest) {
  try {
    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return jsonError("Unauthorized", 401);
    }

    const payload = userProfileUpdateSchema.parse(await request.json());
    const normalizedBio = payload.bio?.trim() || null;
    const nextUser = await updateAppUserProfile({
      userId: appUser.id,
      displayName: payload.displayName.trim(),
      bio: normalizedBio,
    });

    return NextResponse.json({ user: nextUser });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update profile", 400);
  }
}
