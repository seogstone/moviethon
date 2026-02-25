import type { MovieFilters, SortBy, SortDir } from "@/lib/types";

export function parseMovieFilters(searchParams: URLSearchParams): MovieFilters {
  const decadeValue = searchParams.get("decade");
  const sortBy = searchParams.get("sortBy") as SortBy | null;
  const sortDir = searchParams.get("sortDir") as SortDir | null;

  const filters: MovieFilters = {};

  if (decadeValue && /^\d{4}$/.test(decadeValue)) {
    filters.decade = Number(decadeValue);
  }

  const genre = searchParams.get("genre");
  if (genre) {
    filters.genre = genre;
  }

  if (sortBy && ["release_date", "imdb", "community", "owner"].includes(sortBy)) {
    filters.sortBy = sortBy;
  }

  if (sortDir && ["asc", "desc"].includes(sortDir)) {
    filters.sortDir = sortDir;
  }

  return filters;
}
