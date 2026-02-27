import { buildActorMarketMetrics, rankMarketLeaderboards } from "@/lib/market";

describe("market metrics", () => {
  it("builds actor metrics across windows and sparkline buckets", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const [metric] = buildActorMarketMetrics({
      actors: [
        {
          actorId: "a1",
          actorSlug: "actor-1",
          actorName: "Actor 1",
          movieIds: ["m1", "m2"],
        },
      ],
      votes: [
        { movieId: "m1", score: 8, updatedAt: "2026-01-10T12:00:00.000Z" },
        { movieId: "m2", score: 9, updatedAt: "2026-01-14T08:00:00.000Z" },
        { movieId: "m1", score: 6, updatedAt: "2026-01-03T07:00:00.000Z" },
        { movieId: "m2", score: 7, updatedAt: "2026-01-05T21:00:00.000Z" },
        { movieId: "m1", score: 10, updatedAt: "2025-12-30T00:00:00.000Z" },
      ],
      comments: [
        { movieId: "m1", createdAt: "2026-01-12T09:00:00.000Z" },
        { movieId: "m2", createdAt: "2026-01-04T09:00:00.000Z" },
      ],
      windowDays: 7,
      sparkDays: 14,
      minVotesForDelta: 2,
      now,
    });

    expect(metric.ratings7d).toBe(2);
    expect(metric.ratingsPrev7d).toBe(2);
    expect(metric.avgRatingAllTime).toBe(8);
    expect(metric.voteCountAllTime).toBe(5);
    expect(metric.currentAvg7d).toBe(8.5);
    expect(metric.previousAvg7d).toBe(6.5);
    expect(metric.gainerDelta7d).toBe(2);
    expect(metric.comments7d).toBe(1);
    expect(metric.activitySpark14d).toHaveLength(14);
    expect(metric.activitySpark14d.reduce((sum, value) => sum + value, 0)).toBe(4);
  });

  it("gates gainer delta behind minimum vote threshold", () => {
    const [metric] = buildActorMarketMetrics({
      actors: [
        {
          actorId: "a1",
          actorSlug: "actor-1",
          actorName: "Actor 1",
          movieIds: ["m1"],
        },
      ],
      votes: [
        { movieId: "m1", score: 9, updatedAt: "2026-01-14T12:00:00.000Z" },
        { movieId: "m1", score: 7, updatedAt: "2026-01-04T12:00:00.000Z" },
      ],
      comments: [],
      windowDays: 7,
      sparkDays: 14,
      minVotesForDelta: 2,
      now: new Date("2026-01-15T12:00:00.000Z"),
    });

    expect(metric.gainerDelta7d).toBeNull();
  });

  it("ranks leaderboards deterministically", () => {
    const ranked = rankMarketLeaderboards([
      {
        actorId: "a",
        actorSlug: "actor-a",
        actorName: "Actor A",
        ratings7d: 10,
        ratingsPrev7d: 1,
        avgRatingAllTime: 8.2,
        voteCountAllTime: 20,
        currentAvg7d: 8.4,
        previousAvg7d: 7.1,
        gainerDelta7d: 1.3,
        comments7d: 5,
        activitySpark14d: Array.from({ length: 14 }, () => 1),
      },
      {
        actorId: "b",
        actorSlug: "actor-b",
        actorName: "Actor B",
        ratings7d: 10,
        ratingsPrev7d: 2,
        avgRatingAllTime: 7.1,
        voteCountAllTime: 8,
        currentAvg7d: 7.4,
        previousAvg7d: 7.0,
        gainerDelta7d: 0.4,
        comments7d: 8,
        activitySpark14d: Array.from({ length: 14 }, () => 2),
      },
    ]);

    expect(ranked.movers[0].actorId).toBe("a");
    expect(ranked.gainers[0].actorId).toBe("a");
    expect(ranked.discussed[0].actorId).toBe("b");
  });
});
