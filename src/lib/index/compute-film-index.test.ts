import { computeActorIndex, computeGenreIndex } from "@/lib/index/compute-aggregates";
import { computeBayesianRating, computeFilmIndex } from "@/lib/index/compute-film-index";

describe("index computation", () => {
  it("keeps film components and total in 0-100 bounds", () => {
    const result = computeFilmIndex(
      {
        movieId: "m1",
        releaseDate: "2020-01-01",
        imdbRating: 8.1,
        tmdbPopularity: null,
        tmdbPopularityDelta: 3,
        ratingsCount7d: 16,
        ratingsCount30d: 40,
        commentsCount7d: 7,
        commentsCount30d: 25,
        watchlistAdds7d: 3,
        watchlistAdds30d: 12,
        avgRating7d: 8.4,
        avgRating30d: 7.8,
        allTimeAvgRating: 8.2,
        allTimeRatingCount: 120,
        previousIndex7d: 72,
        previousIndex30d: 65,
        previous30dSeries: Array.from({ length: 30 }, (_, index) => 55 + index * 0.6),
        previousQualityComponent: 74,
        previousVelocityComponent: 58,
        previousEngagementComponent: 55,
        previousExternalComponent: 52,
      },
      new Date("2026-02-28T00:00:00.000Z"),
      7.2,
    );

    expect(result.indexValue).toBeGreaterThanOrEqual(0);
    expect(result.indexValue).toBeLessThanOrEqual(100);
    expect(result.qualityComponent).toBeGreaterThanOrEqual(0);
    expect(result.qualityComponent).toBeLessThanOrEqual(100);
    expect(result.velocityComponent).toBeGreaterThanOrEqual(0);
    expect(result.velocityComponent).toBeLessThanOrEqual(100);
    expect(result.engagementComponent).toBeGreaterThanOrEqual(0);
    expect(result.engagementComponent).toBeLessThanOrEqual(100);
    expect(result.recencyComponent).toBeGreaterThanOrEqual(0);
    expect(result.recencyComponent).toBeLessThanOrEqual(100);
    expect(result.externalComponent).toBeGreaterThanOrEqual(0);
    expect(result.externalComponent).toBeLessThanOrEqual(100);
  });

  it("applies bayesian smoothing under low sample sizes", () => {
    const lowSample = computeBayesianRating(10, 1, 7, 20);
    const highSample = computeBayesianRating(10, 300, 7, 20);

    expect(lowSample).toBeLessThan(highSample);
    expect(lowSample).toBeGreaterThan(7);
  });

  it("produces deterministic outputs for same input", () => {
    const input = {
      movieId: "m2",
      releaseDate: "2010-05-05",
      imdbRating: 7.4,
      tmdbPopularity: null,
      tmdbPopularityDelta: -4,
      ratingsCount7d: 5,
      ratingsCount30d: 30,
      commentsCount7d: 2,
      commentsCount30d: 5,
      watchlistAdds7d: 1,
      watchlistAdds30d: 2,
      avgRating7d: 7.1,
      avgRating30d: 7.3,
      allTimeAvgRating: 7.2,
      allTimeRatingCount: 50,
      previousIndex7d: 62,
      previousIndex30d: 64,
      previous30dSeries: Array.from({ length: 30 }, (_, index) => 50 + index * 0.2),
      previousQualityComponent: 68,
      previousVelocityComponent: 49,
      previousEngagementComponent: 47,
      previousExternalComponent: 50,
    };

    const runA = computeFilmIndex(input, new Date("2026-02-28T00:00:00.000Z"), 7.0);
    const runB = computeFilmIndex(input, new Date("2026-02-28T00:00:00.000Z"), 7.0);

    expect(runA).toEqual(runB);
  });

  it("computes actor and genre aggregates with volatility classes", () => {
    const actor = computeActorIndex(
      {
        actorId: "a1",
        actorSlug: "actor-one",
        actorName: "Actor One",
        films: [
          { movieId: "m1", movieTitle: "M1", releaseDate: "2018-01-01", filmIndex: 75, roleWeight: 1 },
          { movieId: "m2", movieTitle: "M2", releaseDate: "2024-01-01", filmIndex: 82, roleWeight: 0.6 },
        ],
        previousIndex7d: 70,
        previousIndex30d: 68,
        previous30dSeries: Array.from({ length: 20 }, (_, i) => 60 + i * 0.5),
      },
      new Date("2026-02-28T00:00:00.000Z"),
    );

    const genre = computeGenreIndex({
      genre: "Drama",
      movieIndexes: [70, 75, 80],
      previousIndex7d: 72,
      previousIndex30d: 69,
      previous30dSeries: [60, 62, 65, 70, 72],
    });

    expect(actor.indexValue).toBeGreaterThan(0);
    expect(actor.volatilityClass).toBeTruthy();
    expect(genre.indexValue).toBeCloseTo(75, 5);
    expect(genre.volatilityClass).toBeTruthy();
  });
});
