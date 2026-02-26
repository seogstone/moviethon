const optionalKeys = new Set([
  "NEXT_PUBLIC_HCAPTCHA_SITE_KEY",
  "HCAPTCHA_SECRET",
  "TMDB_API_KEY",
  "OMDB_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
]);

const defaultValues: Record<string, string> = {
  HCAPTCHA_BYPASS: "true",
  RATE_LIMIT_WINDOW_SECONDS: "60",
  RATE_LIMIT_MAX_REQUESTS: "10",
  INCLUDE_LEGACY_GUEST_VOTES: "true",
};

export function readEnv(key: string): string {
  const fromProcess = process.env[key];
  if (fromProcess) {
    return fromProcess;
  }

  if (defaultValues[key]) {
    return defaultValues[key];
  }

  if (optionalKeys.has(key)) {
    return "";
  }

  throw new Error(`Missing required environment variable: ${key}`);
}

export function hasEnv(key: string): boolean {
  return Boolean(process.env[key] && process.env[key]?.trim().length);
}

export function isCaptchaBypassEnabled(): boolean {
  return readEnv("HCAPTCHA_BYPASS").toLowerCase() === "true";
}

export function includeLegacyGuestVotes(): boolean {
  return readEnv("INCLUDE_LEGACY_GUEST_VOTES").toLowerCase() === "true";
}
