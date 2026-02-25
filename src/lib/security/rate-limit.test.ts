import { enforceRateLimit } from "@/lib/security/rate-limit";

describe("enforceRateLimit", () => {
  it("blocks requests after configured limit in same window", async () => {
    const scope = `test-scope-${Date.now()}`;
    const identity = `ip-ua-${Date.now()}`;

    const first = await enforceRateLimit({ scope, identity, limit: 2, windowSeconds: 10 });
    const second = await enforceRateLimit({ scope, identity, limit: 2, windowSeconds: 10 });
    const third = await enforceRateLimit({ scope, identity, limit: 2, windowSeconds: 10 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });
});
