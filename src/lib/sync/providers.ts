import { readEnv } from "@/lib/env";

export interface TmdbMovieData {
  tmdbId: number;
  overview: string | null;
  posterPath: string | null;
  runtimeMinutes: number | null;
  genres: string[];
}

export interface OmdbMovieData {
  imdbRating: number | null;
  runtimeMinutes: number | null;
  plot: string | null;
}

export interface MergedExternalData {
  tmdbId?: number;
  posterUrl?: string | null;
  synopsis?: string | null;
  runtimeMinutes?: number | null;
  imdbRating?: number | null;
  genres?: string[];
}

interface TmdbPersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity?: number;
}

function parseRuntime(runtime: string | null | undefined): number | null {
  if (!runtime) {
    return null;
  }

  const matched = runtime.match(/\d+/);
  if (!matched) {
    return null;
  }

  return Number(matched[0]);
}

export async function fetchOmdbByImdbId(imdbId: string): Promise<OmdbMovieData | null> {
  const apiKey = readEnv("OMDB_API_KEY");
  if (!apiKey) {
    return null;
  }

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", imdbId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    imdbRating?: string;
    Runtime?: string;
    Plot?: string;
    Response?: string;
  };

  if (payload.Response === "False") {
    return null;
  }

  return {
    imdbRating: payload.imdbRating && payload.imdbRating !== "N/A" ? Number(payload.imdbRating) : null,
    runtimeMinutes: parseRuntime(payload.Runtime),
    plot: payload.Plot && payload.Plot !== "N/A" ? payload.Plot : null,
  };
}

async function fetchTmdbMovieById(tmdbId: number): Promise<TmdbMovieData | null> {
  const apiKey = readEnv("TMDB_API_KEY");
  if (!apiKey) {
    return null;
  }

  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    id: number;
    overview?: string;
    poster_path?: string;
    runtime?: number;
    genres?: { id: number; name: string }[];
  };

  return {
    tmdbId: payload.id,
    overview: payload.overview ?? null,
    posterPath: payload.poster_path ?? null,
    runtimeMinutes: payload.runtime ?? null,
    genres: payload.genres?.map((genre) => genre.name) ?? [],
  };
}

export async function fetchTmdbByImdbId(imdbId: string): Promise<TmdbMovieData | null> {
  const apiKey = readEnv("TMDB_API_KEY");
  if (!apiKey) {
    return null;
  }

  const findUrl = new URL(`https://api.themoviedb.org/3/find/${imdbId}`);
  findUrl.searchParams.set("api_key", apiKey);
  findUrl.searchParams.set("external_source", "imdb_id");

  const findResponse = await fetch(findUrl.toString());
  if (!findResponse.ok) {
    return null;
  }

  const findPayload = (await findResponse.json()) as {
    movie_results?: { id: number }[];
  };

  const tmdbId = findPayload.movie_results?.[0]?.id;
  if (!tmdbId) {
    return null;
  }

  return fetchTmdbMovieById(tmdbId);
}

export function mergeExternalData(tmdb: TmdbMovieData | null, omdb: OmdbMovieData | null): MergedExternalData {
  return {
    tmdbId: tmdb?.tmdbId,
    posterUrl: tmdb?.posterPath ? `https://image.tmdb.org/t/p/w500${tmdb.posterPath}` : undefined,
    synopsis: tmdb?.overview ?? omdb?.plot ?? undefined,
    runtimeMinutes: omdb?.runtimeMinutes ?? tmdb?.runtimeMinutes ?? undefined,
    imdbRating: omdb?.imdbRating ?? undefined,
    genres: tmdb?.genres?.length ? tmdb.genres : undefined,
  };
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function chooseBestPersonResult(results: TmdbPersonSearchResult[], actorName: string): TmdbPersonSearchResult | null {
  if (!results.length) {
    return null;
  }

  const normalized = normalizeName(actorName);
  const actingResults = results.filter((item) => item.known_for_department === "Acting");

  const exactActing = actingResults.find((item) => normalizeName(item.name) === normalized);
  if (exactActing) {
    return exactActing;
  }

  const exactAny = results.find((item) => normalizeName(item.name) === normalized);
  if (exactAny) {
    return exactAny;
  }

  if (actingResults.length) {
    return actingResults.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
  }

  return results.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
}

export async function fetchTmdbActorImageByName(actorName: string): Promise<string | null> {
  const apiKey = readEnv("TMDB_API_KEY");
  if (!apiKey) {
    return null;
  }

  const url = new URL("https://api.themoviedb.org/3/search/person");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", actorName);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { results?: TmdbPersonSearchResult[] };
  const best = chooseBestPersonResult(payload.results ?? [], actorName);
  if (!best?.profile_path) {
    return null;
  }

  return `https://image.tmdb.org/t/p/w780${best.profile_path}`;
}
