import Link from "next/link";
import { notFound } from "next/navigation";

import { MovieGrid } from "@/components/MovieGrid";
import { MovieGridControls } from "@/components/MovieGridControls";
import { filterAndSortMovies } from "@/lib/filter-sort";
import { fallbackActorBySlug, fallbackActorMovies } from "@/lib/data/fallback";
import { getActorBySlug, listActorMovies } from "@/lib/data/queries";
import { parseMovieFilters } from "@/lib/query-params";
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

  try {
    const fromDbActor = await getActorBySlug(actorSlug);
    if (fromDbActor) {
      actor = fromDbActor;
      allMovies = await listActorMovies(actorSlug);
      movies = filterAndSortMovies(allMovies, filters);
    }
  } catch {
    // fallback mode
  }

  if (!actor) {
    notFound();
  }

  const decades = Array.from(new Set(allMovies.map((movie) => movie.decade))).sort();
  const genres = uniqueGenres(allMovies);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 rounded-3xl border border-[#d9d7f2] bg-white p-6 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[#676489] transition hover:text-[#1a1738]"
        >
          ← back to actors
        </Link>
        <h1 className="text-4xl font-semibold text-[#1a1738]">{actor.name} binge list</h1>
        <p className="max-w-3xl text-base text-[#4d4a6b]">
          build your perfect run by jumping across decades, genres, and score signals from critics, fans, and your own
          picks.
        </p>
      </div>

      <MovieGridControls decades={decades} genres={genres} />
      <MovieGrid actor={actor} movies={movies} />
    </main>
  );
}
