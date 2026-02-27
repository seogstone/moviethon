import {
  applyUserVoteUpsert,
  applyVoteUpsert,
  buildCommunityScores,
  computeActorRollupRatings,
  computeCommunityAverage,
  normalizeScore,
  roundToSingleDecimal,
} from "@/lib/ratings";

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

  it("upserts vote by movie and user id", () => {
    const first = applyUserVoteUpsert([], { movieId: "m1", userId: "u1", score: 8 });
    const second = applyUserVoteUpsert(first, { movieId: "m1", userId: "u1", score: 9.2 });

    expect(second).toHaveLength(1);
    expect(second[0].score).toBe(9.2);
  });

  it("builds community scores with and without legacy votes", () => {
    expect(buildCommunityScores([8, 9], [7], true)).toEqual([8, 9, 7]);
    expect(buildCommunityScores([8, 9], [7], false)).toEqual([8, 9]);
  });

  it("computes actor rollup ratings with weighted community average", () => {
    const rollup = computeActorRollupRatings([
      {
        id: "m1",
        actorId: "a1",
        slug: "m1",
        title: "M1",
        releaseDate: "2020-01-01",
        decade: 2020,
        genres: [],
        posterUrl: null,
        imdbId: null,
        tmdbId: null,
        synopsis: null,
        runtimeMinutes: null,
        curatedRank: 1,
        ratings: {
          imdbScore: 7.2,
          ownerScore: 8.1,
          communityAvg: 9.0,
          communityCount: 10,
        },
      },
      {
        id: "m2",
        actorId: "a1",
        slug: "m2",
        title: "M2",
        releaseDate: "2021-01-01",
        decade: 2020,
        genres: [],
        posterUrl: null,
        imdbId: null,
        tmdbId: null,
        synopsis: null,
        runtimeMinutes: null,
        curatedRank: 2,
        ratings: {
          imdbScore: 8.0,
          ownerScore: null,
          communityAvg: 6.0,
          communityCount: 2,
        },
      },
    ]);

    expect(rollup.imdbAvg).toBe(7.6);
    expect(rollup.imdbMovieCount).toBe(2);
    expect(rollup.ownerAvg).toBe(8.1);
    expect(rollup.ownerMovieCount).toBe(1);
    expect(rollup.communityAvg).toBe(8.5);
    expect(rollup.communityVoteCount).toBe(12);
  });
});
