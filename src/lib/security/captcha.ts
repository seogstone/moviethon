import { isCaptchaBypassEnabled, readEnv } from "@/lib/env";

interface CaptchaResponse {
  success: boolean;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
}

export async function verifyCaptcha(token: string, remoteIp?: string): Promise<boolean> {
  if (!token) {
    console.warn("hCaptcha verification failed: missing token");
    return false;
  }

  if (isCaptchaBypassEnabled() && token === "local-test") {
    return true;
  }

  const secret = readEnv("HCAPTCHA_SECRET");
  if (!secret) {
    console.error("hCaptcha verification failed: missing HCAPTCHA_SECRET");
    return false;
  }

  const formBody = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    formBody.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      console.error("hCaptcha verification request failed", { status: response.status });
      return false;
    }

    const parsed = (await response.json()) as CaptchaResponse;
    if (!parsed.success) {
      console.error("hCaptcha verification failed", {
        errorCodes: parsed["error-codes"] ?? [],
        hostname: parsed.hostname ?? null,
        challengeTs: parsed.challenge_ts ?? null,
      });
    }
    return parsed.success;
  } catch (error) {
    console.error("hCaptcha verification exception", error);
    return false;
  }
}
