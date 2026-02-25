const optionalKeys = new Set([
  "NEXT_PUBLIC_HCAPTCHA_SITE_KEY",
  "HCAPTCHA_SECRET",
  "TMDB_API_KEY",
  "OMDB_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
]);

const defaultValues: Record<string, string> = {
  HCAPTCHA_BYPASS: "true",
  RATE_LIMIT_WINDOW_SECONDS: "60",
  RATE_LIMIT_MAX_REQUESTS: "10",
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
