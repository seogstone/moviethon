import { COMMENT_DELETE_TOKEN_TTL_DAYS } from "@/lib/constants";
import { fromBase64Url, hmacSha256, randomToken, sha256, toBase64Url } from "@/lib/crypto";
import { readEnv } from "@/lib/env";

interface DeleteTokenPayload {
  commentId: string;
  nonce: string;
  exp: number;
}

export function createDeleteToken(commentId: string): { token: string; tokenHash: string } {
  const secret = readEnv("DELETE_TOKEN_SECRET");
  const payload: DeleteTokenPayload = {
    commentId,
    nonce: randomToken(12),
    exp: Date.now() + COMMENT_DELETE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = toBase64Url(payloadString);
  const signature = hmacSha256(encodedPayload, secret);
  const token = `${encodedPayload}.${signature}`;

  return {
    token,
    tokenHash: sha256(token),
  };
}

export function verifyDeleteToken(token: string, commentId: string): boolean {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const secret = readEnv("DELETE_TOKEN_SECRET");
  const expectedSig = hmacSha256(encodedPayload, secret);
  if (expectedSig !== signature) {
    return false;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as DeleteTokenPayload;
    if (payload.commentId !== commentId) {
      return false;
    }

    if (payload.exp < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
