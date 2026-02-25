import { createDeleteToken, verifyDeleteToken } from "@/lib/security/delete-token";

describe("delete token", () => {
  it("creates and verifies token for matching comment", () => {
    process.env.DELETE_TOKEN_SECRET = "test-secret";
    const { token } = createDeleteToken("comment-1");
    expect(verifyDeleteToken(token, "comment-1")).toBe(true);
  });

  it("rejects token for different comment", () => {
    process.env.DELETE_TOKEN_SECRET = "test-secret";
    const { token } = createDeleteToken("comment-1");
    expect(verifyDeleteToken(token, "comment-2")).toBe(false);
  });
});
