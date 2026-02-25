import { filterAndSortMovies } from "@/lib/filter-sort";
import type { MovieWithRatings } from "@/lib/types";

const movies: MovieWithRatings[] = [
  {
    id: "1",
    actorId: "a",
    slug: "m1",
    title: "Movie 1",
    releaseDate: "1990-01-01",
    decade: 1990,
    genres: ["Drama"],
    posterUrl: null,
    imdbId: "tt1",
    tmdbId: null,
    synopsis: null,
    runtimeMinutes: 120,
    ratings: { imdbScore: 7.2, ownerScore: 8, communityAvg: 6.5, communityCount: 4 },
    curatedRank: 1,
  },
  {
    id: "2",
    actorId: "a",
    slug: "m2",
    title: "Movie 2",
    releaseDate: "2005-01-01",
    decade: 2000,
    genres: ["Comedy"],
    posterUrl: null,
    imdbId: "tt2",
    tmdbId: null,
    synopsis: null,
    runtimeMinutes: 115,
    ratings: { imdbScore: 8.8, ownerScore: 6, communityAvg: 9.2, communityCount: 12 },
    curatedRank: 2,
  },
];

describe("filterAndSortMovies", () => {
  it("filters by decade", () => {
    const result = filterAndSortMovies(movies, { decade: 1990 });
    expect(result.map((movie) => movie.id)).toEqual(["1"]);
  });

  it("filters by genre", () => {
    const result = filterAndSortMovies(movies, { genre: "Comedy" });
    expect(result.map((movie) => movie.id)).toEqual(["2"]);
  });

  it("sorts by community score descending", () => {
    const result = filterAndSortMovies(movies, { sortBy: "community", sortDir: "desc" });
    expect(result.map((movie) => movie.id)).toEqual(["2", "1"]);
  });
});
