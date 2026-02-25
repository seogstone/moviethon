import { verifyCaptcha } from "@/lib/security/captcha";

describe("verifyCaptcha", () => {
  it("accepts local-test when bypass is enabled", async () => {
    process.env.HCAPTCHA_BYPASS = "true";
    await expect(verifyCaptcha("local-test")).resolves.toBe(true);
  });

  it("rejects empty token", async () => {
    await expect(verifyCaptcha("")).resolves.toBe(false);
  });
});
