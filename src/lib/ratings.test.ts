import { applyVoteUpsert, computeCommunityAverage, normalizeScore, roundToSingleDecimal } from "@/lib/ratings";

describe("ratings helpers", () => {
  it("rounds to one decimal place", () => {
    expect(roundToSingleDecimal(8.36)).toBe(8.4);
  });

  it("computes community average", () => {
    expect(computeCommunityAverage([7, 8, 9])).toBe(8);
    expect(computeCommunityAverage([])).toBe(0);
  });

  it("normalizes score into 1-10 range", () => {
    expect(normalizeScore(12)).toBe(10);
    expect(normalizeScore(0.2)).toBe(1);
  });

  it("upserts vote by guest key", () => {
    const first = applyVoteUpsert([], { guestKeyHash: "a", score: 8 });
    const second = applyVoteUpsert(first, { guestKeyHash: "a", score: 9.1 });

    expect(second).toHaveLength(1);
    expect(second[0].score).toBe(9.1);
  });
});
