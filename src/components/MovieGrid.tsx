import Link from "next/link";

import { WatchlistToggle } from "@/components/WatchlistToggle";
import { formatDate, formatScore } from "@/lib/format";
import type { Actor, MovieWithRatings } from "@/lib/types";

interface MovieGridProps {
  actor: Actor;
  movies: MovieWithRatings[];
  isAuthenticated: boolean;
  watchlistMovieIds: Set<string>;
}

function scoreBadge(label: string, value: string) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#0f1318] px-2.5 py-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xs font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}

export function MovieGrid({ actor, movies, isAuthenticated, watchlistMovieIds }: MovieGridProps) {
  if (!movies.length) {
    return (
      <p className="panel-shell rounded-2xl p-5 text-sm text-[var(--muted)]">
        no movies match this filter combination.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {movies.map((movie) => (
        <article
          key={movie.id}
          className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] transition hover:-translate-y-0.5"
        >
          <div className="relative">
            <WatchlistToggle
              movieId={movie.id}
              initialInWatchlist={watchlistMovieIds.has(movie.id)}
              isAuthenticated={isAuthenticated}
              className="absolute right-3 top-3 z-10"
            />
            <Link href={`/movies/${movie.slug}?actor=${actor.slug}`} className="block">
              <div
                className="aspect-[2/3] w-full border-b border-[var(--border)] bg-no-repeat bg-center"
                style={{
                  backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : "none",
                  backgroundSize: "contain",
                  backgroundColor: "#0f1318",
                }}
              />

              <div className="space-y-3 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">{formatDate(movie.releaseDate)}</p>
                <h3 className="line-clamp-2 text-xl font-semibold text-[var(--foreground)]">{movie.title}</h3>
                <p className="line-clamp-2 text-sm text-[var(--muted)]">{movie.genres.join(" • ")}</p>

                <div className="grid grid-cols-3 gap-2">
                  {scoreBadge("IMDb", formatScore(movie.ratings.imdbScore))}
                  {scoreBadge("You", formatScore(movie.ratings.ownerScore))}
                  {scoreBadge("Community", formatScore(movie.ratings.communityAvg))}
                </div>
              </div>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
