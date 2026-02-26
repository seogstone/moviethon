import { NextResponse } from "next/server";

import { getAuth0Client } from "@/lib/auth/auth0";

export async function proxy(request: Request) {
  try {
    const auth0 = getAuth0Client();
    if (!auth0) {
      return NextResponse.next();
    }

    return auth0.middleware(request);
  } catch (error) {
    console.error("Auth0 middleware bypassed due to runtime error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
