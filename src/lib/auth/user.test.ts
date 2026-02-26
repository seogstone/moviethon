import { toAuthIdentity } from "@/lib/auth/user";

describe("auth user mapping", () => {
  it("maps Auth0 profile fields into identity", () => {
    expect(
      toAuthIdentity({
        sub: "auth0|abc123",
        email: "user@example.com",
        name: "Movie Fan",
        picture: "https://example.com/avatar.png",
      }),
    ).toEqual({
      auth0Sub: "auth0|abc123",
      email: "user@example.com",
      name: "Movie Fan",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("returns null when Auth0 profile is missing sub", () => {
    expect(toAuthIdentity({ email: "missing-sub@example.com" })).toBeNull();
  });
});
