import { randomUUID } from "node:crypto";

import { GUEST_COOKIE_NAME } from "@/lib/constants";
import { sha256 } from "@/lib/crypto";

export interface GuestContext {
  guestKey: string;
  guestKeyHash: string;
  ipHash: string;
  fingerprintHash: string;
  ipAddress: string;
  setCookieHeader?: string;
}

export function getIpAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "0.0.0.0";
}

function cookieHeaderValue(guestKey: string): string {
  return `${GUEST_COOKIE_NAME}=${guestKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}

export function buildGuestContext(cookieStore: Map<string, string>, headers: Headers): GuestContext {
  let guestKey = cookieStore.get(GUEST_COOKIE_NAME);
  let setCookieHeader: string | undefined;

  if (!guestKey) {
    guestKey = randomUUID();
    setCookieHeader = cookieHeaderValue(guestKey);
  }

  const ipAddress = getIpAddress(headers);
  const userAgent = headers.get("user-agent") ?? "unknown";

  return {
    guestKey,
    guestKeyHash: sha256(guestKey),
    ipHash: sha256(ipAddress),
    fingerprintHash: sha256(`${ipAddress}:${userAgent}`),
    ipAddress,
    setCookieHeader,
  };
}

export function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const map = new Map<string, string>();

  if (!cookieHeader) {
    return map;
  }

  for (const token of cookieHeader.split(";")) {
    const [rawKey, ...rest] = token.trim().split("=");
    if (!rawKey || !rest.length) {
      continue;
    }
    map.set(rawKey, rest.join("="));
  }

  return map;
}
