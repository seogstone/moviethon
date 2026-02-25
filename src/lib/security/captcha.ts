import { isCaptchaBypassEnabled, readEnv } from "@/lib/env";

interface CaptchaResponse {
  success: boolean;
}

export async function verifyCaptcha(token: string, remoteIp?: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  if (isCaptchaBypassEnabled() && token === "local-test") {
    return true;
  }

  const secret = readEnv("HCAPTCHA_SECRET");
  if (!secret) {
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
      return false;
    }

    const parsed = (await response.json()) as CaptchaResponse;
    return parsed.success;
  } catch {
    return false;
  }
}
