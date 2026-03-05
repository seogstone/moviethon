import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { readEnv } from "../src/lib/env";
import {
  replaceActorMovieCuration,
  upsertActor,
  upsertActorMovie,
  upsertMovie,
} from "../src/lib/data/queries";
import { fetchOmdbByImdbId } from "../src/lib/sync/providers";

interface TargetActor {
  name: string;
  slug: string;
}

interface TmdbSearchPerson {
  id: number;
  name: string;
  known_for_department?: string;
  popularity?: number;
}

interface TmdbCredit {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  character?: string;
  order?: number;
  genre_ids?: number[];
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  imdb_id: string | null;
  runtime: number | null;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  vote_count: number;
  popularity: number;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      order?: number;
      character?: string;
    }>;
  };
}

interface TmdbPersonDetail {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
}

interface SelectedMovie {
  detail: TmdbMovieDetail;
  imdbRating: number | null;
  runtimeMinutes: number | null;
  roleOrder: number;
}

const BASELINE_ACTORS: TargetActor[] = [
  { name: "Tom Hanks", slug: "tom-hanks" },
  { name: "Adam Sandler", slug: "adam-sandler" },
  { name: "Robert De Niro", slug: "robert-de-niro" },
  { name: "Al Pacino", slug: "al-pacino" },
  { name: "Morgan Freeman", slug: "morgan-freeman" },
  { name: "Jack Nicholson", slug: "jack-nicholson" },
];

const DEFAULT_TOP_ACTORS_FILE = "top-actors.md";
const MIN_MOVIES_PER_ACTOR = 8;
const TARGET_MOVIES_PER_ACTOR = 25;

const tmdbMovieDetailCache = new Map<number, Promise<TmdbMovieDetail>>();
const omdbCache = new Map<string, Promise<Awaited<ReturnType<typeof fetchOmdbByImdbId>>>>();

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function toPosterUrl(pathValue: string | null): string | null {
  return pathValue ? `https://image.tmdb.org/t/p/w780${pathValue}` : null;
}

function trimBio(bio: string, fallback: string): string {
  const cleaned = bio.trim();
  if (!cleaned) {
    return fallback;
  }

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim();
  return sentence && sentence.length >= 20 ? sentence : cleaned.slice(0, 260);
}

function parseTopActors(filePath: string): TargetActor[] {
  const fullPath = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(fullPath, "utf-8");

  const names: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const name = normalizeWhitespace(match[1]);
    if (!name) {
      continue;
    }

    names.push(name);
  }

  return names.map((name) => ({
    name,
    slug: slugify(name),
  }));
}

function buildTargetActors(filePath: string): TargetActor[] {
  const combined = [...BASELINE_ACTORS, ...parseTopActors(filePath)];
  const seen = new Set<string>();
  const results: TargetActor[] = [];

  for (const actor of combined) {
    const key = normalizeComparable(actor.name);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push({
      name: normalizeWhitespace(actor.name),
      slug: actor.slug || slugify(actor.name),
    });
  }

  return results;
}

function parseArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

async function tmdbFetch<T>(pathValue: string, searchParams: Record<string, string> = {}): Promise<T> {
  const apiKey = readEnv("TMDB_API_KEY");
  const url = new URL(`https://api.themoviedb.org/3${pathValue}`);
  url.searchParams.set("api_key", apiKey);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDb request failed (${response.status}) for ${pathValue}`);
  }

  return (await response.json()) as T;
}

function pickBestPerson(results: TmdbSearchPerson[], actorName: string): TmdbSearchPerson | null {
  if (!results.length) {
    return null;
  }

  const normalized = normalizeName(actorName);
  const acting = results.filter((item) => item.known_for_department === "Acting");

  const exactActing = acting.find((item) => normalizeName(item.name) === normalized);
  if (exactActing) {
    return exactActing;
  }

  const exactAny = results.find((item) => normalizeName(item.name) === normalized);
  if (exactAny) {
    return exactAny;
  }

  const source = acting.length ? acting : results;
  return source.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
}

function creditScore(credit: TmdbCredit): number {
  const votes = credit.vote_count ?? 0;
  const quality = credit.vote_average ?? 0;
  const popularity = credit.popularity ?? 0;
  return quality * 2 + Math.log10(votes + 1) + popularity / 60;
}

function finalMovieScore(detail: TmdbMovieDetail, imdbRating: number | null, roleOrder: number): number {
  const sourceRating = imdbRating ?? detail.vote_average ?? 0;
  const votes = detail.vote_count ?? 0;
  const popularity = detail.popularity ?? 0;
  const roleBoost = roleOrder <= 5 ? 1.08 : roleOrder <= 10 ? 1.03 : roleOrder <= 20 ? 1 : 0.94;
  return (sourceRating * 2 + Math.log10(votes + 1) + popularity / 80) * roleBoost;
}

function hasDisallowedGenre(detail: TmdbMovieDetail): boolean {
  return detail.genres.some((genre) => genre.name === "Documentary" || genre.name === "TV Movie");
}

function hasSelfOrArchiveRole(character?: string): boolean {
  if (!character) {
    return false;
  }

  const normalized = character.toLowerCase();
  return (
    normalized.includes("self") ||
    normalized.includes("himself") ||
    normalized.includes("herself") ||
    normalized.includes("archive footage") ||
    normalized.includes("uncredited")
  );
}

function actorRoleOrder(detail: TmdbMovieDetail, personId: number): number | null {
  const cast = detail.credits?.cast ?? [];
  const actorCast = cast.find((member) => member.id === personId);
  if (!actorCast) {
    return null;
  }

  if (hasSelfOrArchiveRole(actorCast.character)) {
    return null;
  }

  return actorCast.order ?? null;
}

async function getMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  const cached = tmdbMovieDetailCache.get(tmdbId);
  if (cached) {
    return cached;
  }

  const promise = tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}`, {
    append_to_response: "credits",
  });

  tmdbMovieDetailCache.set(tmdbId, promise);
  return promise;
}

async function getOmdb(imdbId: string): Promise<Awaited<ReturnType<typeof fetchOmdbByImdbId>>> {
  const cached = omdbCache.get(imdbId);
  if (cached) {
    return cached;
  }

  const promise = fetchOmdbByImdbId(imdbId).catch(() => null);
  omdbCache.set(imdbId, promise);
  return promise;
}

function sanitizeMovieTitle(title: string): string {
  return normalizeWhitespace(title).replace(/\s+/g, " ");
}

async function buildSelectedMovies(target: TargetActor, personId: number): Promise<SelectedMovie[]> {
  const creditsPayload = await tmdbFetch<{ cast: TmdbCredit[] }>(`/person/${personId}/movie_credits`);

  const candidateCredits = (creditsPayload.cast ?? [])
    .filter((credit) => credit.release_date && credit.title)
    .filter((credit) => (credit.vote_count ?? 0) >= 15)
    .filter((credit) => !(credit.genre_ids ?? []).includes(99))
    .filter((credit) => !hasSelfOrArchiveRole(credit.character))
    .filter((credit) => (credit.order ?? 999) <= 35)
    .sort((a, b) => creditScore(b) - creditScore(a))
    .slice(0, 160);

  const selected: SelectedMovie[] = [];

  for (const credit of candidateCredits) {
    let detail: TmdbMovieDetail;
    try {
      detail = await getMovieDetail(credit.id);
    } catch {
      continue;
    }

    if (!detail.release_date || !detail.title || hasDisallowedGenre(detail)) {
      continue;
    }

    const roleOrder = actorRoleOrder(detail, personId);
    if (roleOrder === null || roleOrder > 35) {
      continue;
    }

    const omdb = detail.imdb_id ? await getOmdb(detail.imdb_id) : null;

    selected.push({
      detail,
      imdbRating: omdb?.imdbRating ?? null,
      runtimeMinutes: omdb?.runtimeMinutes ?? detail.runtime ?? null,
      roleOrder,
    });
  }

  const dedupedByMovie = new Map<number, SelectedMovie>();
  for (const movie of selected) {
    if (!dedupedByMovie.has(movie.detail.id)) {
      dedupedByMovie.set(movie.detail.id, movie);
    }
  }

  const ranked = Array.from(dedupedByMovie.values()).sort((a, b) => {
    const scoreDiff =
      finalMovieScore(b.detail, b.imdbRating, b.roleOrder) - finalMovieScore(a.detail, a.imdbRating, a.roleOrder);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return new Date(b.detail.release_date).getTime() - new Date(a.detail.release_date).getTime();
  });

  const chosen = ranked.slice(0, TARGET_MOVIES_PER_ACTOR);

  if (chosen.length < MIN_MOVIES_PER_ACTOR) {
    throw new Error(
      `Only found ${chosen.length} qualifying movies for ${target.name}; expected at least ${MIN_MOVIES_PER_ACTOR}`,
    );
  }

  return chosen;
}

async function runForActor(target: TargetActor) {
  const personSearch = await tmdbFetch<{ results: TmdbSearchPerson[] }>("/search/person", {
    query: target.name,
    include_adult: "false",
    page: "1",
  });

  const person = pickBestPerson(personSearch.results ?? [], target.name);
  if (!person) {
    throw new Error(`No TMDb person found for ${target.name}`);
  }

  const personDetail = await tmdbFetch<TmdbPersonDetail>(`/person/${person.id}`);
  const selectedMovies = await buildSelectedMovies(target, person.id);

  const heroImage =
    toPosterUrl(personDetail.profile_path) ??
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80";
  const actorBio = trimBio(personDetail.biography, `${target.name} binge list.`);

  const actor = await upsertActor({
    slug: target.slug,
    name: target.name,
    heroImage,
    bio: actorBio,
    isFeatured: true,
  });

  const rankedMovieIds: string[] = [];

  for (const [index, movie] of selectedMovies.entries()) {
    const detail = movie.detail;
    const year = detail.release_date.slice(0, 4);
    const movieSlug = `${slugify(sanitizeMovieTitle(detail.title))}-${year}-${detail.id}`;

    const movieId = await upsertMovie({
      slug: movieSlug,
      title: sanitizeMovieTitle(detail.title),
      releaseDate: detail.release_date,
      genres: detail.genres.map((genre) => genre.name),
      imdbId: detail.imdb_id,
      tmdbId: detail.id,
      posterUrl: toPosterUrl(detail.poster_path),
      runtimeMinutes: movie.runtimeMinutes,
      imdbRating: movie.imdbRating,
      synopsis: detail.overview || `${target.name} film`,
    });

    rankedMovieIds.push(movieId);

    await upsertActorMovie({
      actorId: actor.id,
      movieId,
      curatedRank: index + 1,
    });
  }

  await replaceActorMovieCuration(actor.id, rankedMovieIds);

  return {
    actor: target.name,
    personId: person.id,
    moviesAdded: rankedMovieIds.length,
  };
}

async function run() {
  const actorsPath = parseArgValue("--actors-file") ?? DEFAULT_TOP_ACTORS_FILE;
  const limitArg = parseArgValue("--limit");
  const limit = limitArg ? Number(limitArg) : null;
  const onlyActor = parseArgValue("--only");

  const targetActors = buildTargetActors(actorsPath)
    .filter((actor) => (onlyActor ? normalizeComparable(actor.name) === normalizeComparable(onlyActor) : true))
    .slice(0, limit && Number.isFinite(limit) && limit > 0 ? limit : undefined);

  if (!targetActors.length) {
    throw new Error("No actors resolved for seeding. Check top-actors.md or flags.");
  }

  console.log(
    JSON.stringify(
      {
        actorsFile: actorsPath,
        actorCount: targetActors.length,
        targetMoviesPerActor: TARGET_MOVIES_PER_ACTOR,
        minMoviesPerActor: MIN_MOVIES_PER_ACTOR,
      },
      null,
      2,
    ),
  );

  const results: Array<{ actor: string; personId: number; moviesAdded: number }> = [];
  const failures: Array<{ actor: string; error: string }> = [];

  for (const target of targetActors) {
    try {
      const result = await runForActor(target);
      results.push(result);
      console.log(`Seeded ${target.name}: ${result.moviesAdded} movies`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ actor: target.name, error: message });
      console.warn(`Skipped ${target.name}: ${message}`);
    }
  }

  console.log("Done:");
  console.log(
    JSON.stringify(
      {
        successes: results.length,
        failureCount: failures.length,
        results,
        failures,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
