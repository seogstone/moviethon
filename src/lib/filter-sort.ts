import type { MovieFilters, MovieWithRatings, SortBy, SortDir } from "@/lib/types";

function compareNumber(a: number | null, b: number | null, dir: SortDir): number {
  const left = a ?? -1;
  const right = b ?? -1;
  if (left === right) {
    return 0;
  }
  return dir === "asc" ? left - right : right - left;
}

export function filterAndSortMovies(
  movies: MovieWithRatings[],
  filters: MovieFilters,
): MovieWithRatings[] {
  const decade = filters.decade;
  const genre = filters.genre?.trim().toLowerCase();
  const sortBy: SortBy = filters.sortBy ?? "release_date";
  const sortDir: SortDir = filters.sortDir ?? (sortBy === "release_date" ? "asc" : "desc");

  const filtered = movies.filter((movie) => {
    if (typeof decade === "number" && movie.decade !== decade) {
      return false;
    }

    if (genre && !movie.genres.some((item) => item.toLowerCase() === genre)) {
      return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (sortBy === "release_date") {
      const left = new Date(a.releaseDate).getTime();
      const right = new Date(b.releaseDate).getTime();
      return sortDir === "asc" ? left - right : right - left;
    }

    if (sortBy === "imdb") {
      return compareNumber(a.ratings.imdbScore, b.ratings.imdbScore, sortDir);
    }

    if (sortBy === "community") {
      return compareNumber(a.ratings.communityAvg, b.ratings.communityAvg, sortDir);
    }

    return compareNumber(a.ratings.ownerScore, b.ratings.ownerScore, sortDir);
  });
}
