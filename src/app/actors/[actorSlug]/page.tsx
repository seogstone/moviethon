import Link from "next/link";
import { notFound } from "next/navigation";

import { MovieGrid } from "@/components/MovieGrid";
import { MovieGridControls } from "@/components/MovieGridControls";
import { getCurrentAppUser } from "@/lib/auth/user";
import { filterAndSortMovies } from "@/lib/filter-sort";
import { fallbackActorBySlug, fallbackActorMovies } from "@/lib/data/fallback";
import { getActorBySlug, listActorMovies, listWatchlistMovieIdsForUser } from "@/lib/data/queries";
import { formatScore } from "@/lib/format";
import { parseMovieFilters } from "@/lib/query-params";
import { computeActorRollupRatings } from "@/lib/ratings";
import type { MovieWithRatings } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ActorPageProps {
  params: Promise<{ actorSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function uniqueGenres(items: MovieWithRatings[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const genre of item.genres) {
      set.add(genre);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default async function ActorPage({ params, searchParams }: ActorPageProps) {
  const { actorSlug } = await params;
  const rawSearchParams = await searchParams;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (typeof value === "string") {
      search.set(key, value);
    }
  }

  const filters = parseMovieFilters(search);

  let actor = fallbackActorBySlug(actorSlug);
  let allMovies = fallbackActorMovies(actorSlug);
  let movies = filterAndSortMovies(allMovies, filters);
  let appUser: Awaited<ReturnType<typeof getCurrentAppUser>> = null;
  let watchlistMovieIds = new Set<string>();

  try {
    appUser = await getCurrentAppUser();
  } catch {
    appUser = null;
  }

  try {
    const fromDbActor = await getActorBySlug(actorSlug);
    if (fromDbActor) {
      actor = fromDbActor;
      allMovies = await listActorMovies(actorSlug);
      movies = filterAndSortMovies(allMovies, filters);
      if (appUser) {
        watchlistMovieIds = await listWatchlistMovieIdsForUser(
          appUser.id,
          allMovies.map((item) => item.id),
        );
      }
    }
  } catch {
    // fallback mode
  }

  if (!actor) {
    notFound();
  }

  const decades = Array.from(new Set(allMovies.map((movie) => movie.decade))).sort();
  const genres = uniqueGenres(allMovies);
  const rollup = computeActorRollupRatings(allMovies);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 rounded-3xl border border-[#d9d7f2] bg-white p-6 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[#676489] transition hover:text-[#1a1738]"
        >
          ← back to actors
        </Link>

        <div className="grid grid-cols-[108px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6">
          <div
            className="aspect-[2/3] w-full rounded-2xl border border-[#e4e3f7] bg-no-repeat bg-center"
            style={{
              backgroundImage: actor.heroImage ? `url(${actor.heroImage})` : "linear-gradient(140deg, #efeeff, #ffffff)",
              backgroundSize: "contain",
              backgroundColor: "#f3f2ff",
            }}
          />

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-[#1a1738]">{actor.name} binge list</h1>
            <p className="max-w-3xl text-base text-[#4d4a6b]">
              {actor.bio ??
                "build your perfect run by jumping across decades, genres, and score signals from critics, fans, and your own picks."}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">imdb avg</p>
                <p className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(rollup.imdbAvg)}</p>
                <p className="mt-1 text-xs text-[#676489]">{rollup.imdbMovieCount} movies</p>
              </div>
              <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">your curated avg</p>
                <p className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(rollup.ownerAvg)}</p>
                <p className="mt-1 text-xs text-[#676489]">{rollup.ownerMovieCount} movies</p>
              </div>
              <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">community avg</p>
                <p className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(rollup.communityAvg)}</p>
                <p className="mt-1 text-xs text-[#676489]">{rollup.communityVoteCount} votes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MovieGridControls decades={decades} genres={genres} />
      <MovieGrid
        actor={actor}
        movies={movies}
        isAuthenticated={Boolean(appUser)}
        watchlistMovieIds={watchlistMovieIds}
      />
    </main>
  );
}
