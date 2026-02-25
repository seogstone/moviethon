import "dotenv/config";

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

const TARGET_ACTORS: TargetActor[] = [
  { name: "Tom Hanks", slug: "tom-hanks" },
  { name: "Adam Sandler", slug: "adam-sandler" },
  { name: "Robert De Niro", slug: "robert-de-niro" },
  { name: "Al Pacino", slug: "al-pacino" },
  { name: "Morgan Freeman", slug: "morgan-freeman" },
  { name: "Jack Nicholson", slug: "jack-nicholson" },
];

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toPosterUrl(path: string | null): string | null {
  return path ? `https://image.tmdb.org/t/p/w780${path}` : null;
}

function trimBio(bio: string, fallback: string): string {
  const cleaned = bio.trim();
  if (!cleaned) {
    return fallback;
  }

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim();
  return sentence && sentence.length >= 20 ? sentence : cleaned.slice(0, 260);
}

async function tmdbFetch<T>(path: string, searchParams: Record<string, string> = {}): Promise<T> {
  const apiKey = readEnv("TMDB_API_KEY");
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", apiKey);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDb request failed (${response.status}) for ${path}`);
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

function finalMovieScore(detail: TmdbMovieDetail, imdbRating: number | null): number {
  const sourceRating = imdbRating ?? detail.vote_average ?? 0;
  const votes = detail.vote_count ?? 0;
  const popularity = detail.popularity ?? 0;
  return sourceRating * 2 + Math.log10(votes + 1) + popularity / 80;
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

function movieHasQualifiedActorRole(detail: TmdbMovieDetail, personId: number, maxOrder: number): boolean {
  const cast = detail.credits?.cast ?? [];
  const actorCast = cast.find((member) => member.id === personId);
  if (!actorCast) {
    return false;
  }

  const order = actorCast.order ?? 999;
  if (order > maxOrder) {
    return false;
  }

  if (hasSelfOrArchiveRole(actorCast.character)) {
    return false;
  }

  return true;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let pointer = 0;

  async function worker() {
    while (pointer < items.length) {
      const index = pointer;
      pointer += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
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
  const creditsPayload = await tmdbFetch<{ cast: TmdbCredit[] }>(`/person/${person.id}/movie_credits`);

  const filteredCredits = (creditsPayload.cast ?? [])
    .filter((credit) => credit.release_date && credit.title)
    .filter((credit) => (credit.vote_count ?? 0) >= 80)
    .filter((credit) => !(credit.genre_ids ?? []).includes(99))
    .filter((credit) => !hasSelfOrArchiveRole(credit.character))
    .filter((credit) => (credit.order ?? 999) <= 20)
    .sort((a, b) => creditScore(b) - creditScore(a))
    .slice(0, 120);

  const detailedCandidates = await mapWithConcurrency(filteredCredits, 5, async (credit) => {
    const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${credit.id}`, {
      append_to_response: "credits",
    });

    if (!detail.release_date || !detail.title) {
      return null;
    }

    if (hasDisallowedGenre(detail)) {
      return null;
    }

    if (!movieHasQualifiedActorRole(detail, person.id, 20)) {
      return null;
    }

    const omdb = detail.imdb_id ? await fetchOmdbByImdbId(detail.imdb_id) : null;
    return {
      detail,
      imdbRating: omdb?.imdbRating ?? null,
      runtimeMinutes: omdb?.runtimeMinutes ?? detail.runtime ?? null,
    };
  });

  const qualified = detailedCandidates
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      const scoreDiff = finalMovieScore(b.detail, b.imdbRating) - finalMovieScore(a.detail, a.imdbRating);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return new Date(b.detail.release_date).getTime() - new Date(a.detail.release_date).getTime();
    });

  const strictRoleCandidates = qualified.filter((item) => movieHasQualifiedActorRole(item.detail, person.id, 8));
  const mediumRoleCandidates = qualified.filter((item) => movieHasQualifiedActorRole(item.detail, person.id, 12));
  const broadRoleCandidates = qualified.filter((item) => movieHasQualifiedActorRole(item.detail, person.id, 20));

  const chosenPool =
    strictRoleCandidates.length >= 25
      ? strictRoleCandidates
      : mediumRoleCandidates.length >= 25
        ? mediumRoleCandidates
        : broadRoleCandidates;

  const selected = chosenPool.slice(0, 25);

  if (selected.length < 25) {
    throw new Error(`Only found ${selected.length} qualifying movies for ${target.name}`);
  }

  const heroImage = toPosterUrl(personDetail.profile_path) ?? "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80";
  const actorBio = trimBio(personDetail.biography, `${target.name} binge list.`);

  const actor = await upsertActor({
    slug: target.slug,
    name: target.name,
    heroImage,
    bio: actorBio,
    isFeatured: true,
  });

  const rankedMovieIds: string[] = [];

  for (const [index, movie] of selected.entries()) {
    const detail = movie.detail;
    const year = detail.release_date.slice(0, 4);
    const movieSlug = `${slugify(detail.title)}-${year}-${detail.id}`;
    const movieId = await upsertMovie({
      slug: movieSlug,
      title: detail.title,
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
  const results = [];

  for (const target of TARGET_ACTORS) {
    const result = await runForActor(target);
    results.push(result);
    console.log(`Seeded ${target.name}: ${result.moviesAdded} movies`);
  }

  console.log("Done:");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
