import Link from "next/link";

import { formatDate, formatScore } from "@/lib/format";
import type { Actor, MovieWithRatings } from "@/lib/types";

interface MovieGridProps {
  actor: Actor;
  movies: MovieWithRatings[];
}

function scoreBadge(label: string, value: string) {
  return (
    <div className="rounded-xl border border-[#e4e3f7] bg-[#f8f7ff] px-2.5 py-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">{label}</div>
      <div className="mt-1 text-xs font-medium text-[#1a1738]">{value}</div>
    </div>
  );
}

export function MovieGrid({ actor, movies }: MovieGridProps) {
  if (!movies.length) {
    return (
      <p className="rounded-2xl border border-[#d9d7f2] bg-white p-5 text-sm text-[#676489]">
        no movies match this filter combination.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {movies.map((movie) => (
        <Link
          key={movie.id}
          href={`/actors/${actor.slug}/movies/${movie.slug}`}
          className="group overflow-hidden rounded-3xl border border-[#d9d7f2] bg-white shadow-[0_10px_24px_rgba(42,39,85,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(42,39,85,0.1)]"
        >
          <div
            className="aspect-[2/3] w-full border-b border-[#e4e3f7] bg-no-repeat bg-center"
            style={{
              backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : "linear-gradient(180deg, #f2f1ff, #fafafe)",
              backgroundSize: "contain",
              backgroundColor: "#f3f2ff",
            }}
          />

          <div className="space-y-3 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">{formatDate(movie.releaseDate)}</p>
            <h3 className="line-clamp-2 text-xl font-semibold text-[#1a1738]">{movie.title}</h3>
            <p className="line-clamp-2 text-sm text-[#676489]">{movie.genres.join(" • ")}</p>

            <div className="grid grid-cols-3 gap-2">
              {scoreBadge("IMDb", formatScore(movie.ratings.imdbScore))}
              {scoreBadge("You", formatScore(movie.ratings.ownerScore))}
              {scoreBadge("Community", formatScore(movie.ratings.communityAvg))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
