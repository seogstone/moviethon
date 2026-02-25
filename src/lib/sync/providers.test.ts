import { mergeExternalData } from "@/lib/sync/providers";

describe("mergeExternalData", () => {
  it("prefers OMDb runtime and rating with TMDb poster/synopsis", () => {
    const result = mergeExternalData(
      {
        tmdbId: 25,
        overview: "TMDb overview",
        posterPath: "/poster.jpg",
        runtimeMinutes: 110,
        genres: ["Drama"],
      },
      {
        imdbRating: 8.2,
        runtimeMinutes: 112,
        plot: "OMDb plot",
      },
    );

    expect(result).toEqual({
      tmdbId: 25,
      posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
      synopsis: "TMDb overview",
      runtimeMinutes: 112,
      imdbRating: 8.2,
      genres: ["Drama"],
    });
  });

  it("falls back to OMDb plot when TMDb overview missing", () => {
    const result = mergeExternalData(null, {
      imdbRating: null,
      runtimeMinutes: 95,
      plot: "Fallback plot",
    });

    expect(result.synopsis).toBe("Fallback plot");
  });
});
