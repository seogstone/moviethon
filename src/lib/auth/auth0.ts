import { Auth0Client } from "@auth0/nextjs-auth0/server";

const requiredKeys = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
] as const;

let auth0Client: Auth0Client | null | undefined;

export function isAuth0Configured(): boolean {
  return requiredKeys.every((key) => Boolean(process.env[key]?.trim()));
}

export function getAuth0Client(): Auth0Client | null {
  if (!isAuth0Configured()) {
    return null;
  }

  if (auth0Client !== undefined) {
    return auth0Client;
  }

  auth0Client = new Auth0Client();
  return auth0Client;
}
