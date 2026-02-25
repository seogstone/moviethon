import { createHash, createHmac, randomBytes } from "node:crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacSha256(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("hex");
}

export function randomToken(size = 24): string {
  return randomBytes(size).toString("base64url");
}

export function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

export function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}
