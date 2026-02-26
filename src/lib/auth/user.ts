import { getAppUserByAuth0Sub, upsertAppUser } from "@/lib/data/queries";
import type { AppUser } from "@/lib/types";
import { getAuth0Client } from "@/lib/auth/auth0";

export interface AuthIdentity {
  auth0Sub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function toAuthIdentity(user: unknown): AuthIdentity | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const profile = user as Record<string, unknown>;
  const auth0Sub = readString(profile.sub);
  if (!auth0Sub) {
    return null;
  }

  return {
    auth0Sub,
    email: readString(profile.email),
    name: readString(profile.name) ?? readString(profile.nickname),
    avatarUrl: readString(profile.picture),
  };
}

export async function getAuthIdentityFromSession(): Promise<AuthIdentity | null> {
  const auth0 = getAuth0Client();
  if (!auth0) {
    return null;
  }

  const session = await auth0.getSession();
  return toAuthIdentity(session?.user ?? null);
}

export async function getCurrentAppUser(options?: { upsert?: boolean }): Promise<AppUser | null> {
  const identity = await getAuthIdentityFromSession();
  if (!identity) {
    return null;
  }

  if (options?.upsert === false) {
    return getAppUserByAuth0Sub(identity.auth0Sub);
  }

  return upsertAppUser(identity);
}
