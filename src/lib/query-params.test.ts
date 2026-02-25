import { parseMovieFilters } from "@/lib/query-params";

describe("parseMovieFilters", () => {
  it("parses supported fields", () => {
    const params = new URLSearchParams({
      decade: "1990",
      genre: "Drama",
      sortBy: "community",
      sortDir: "desc",
    });

    expect(parseMovieFilters(params)).toEqual({
      decade: 1990,
      genre: "Drama",
      sortBy: "community",
      sortDir: "desc",
    });
  });

  it("ignores invalid decade", () => {
    const params = new URLSearchParams({ decade: "ninety" });
    expect(parseMovieFilters(params)).toEqual({});
  });
});
