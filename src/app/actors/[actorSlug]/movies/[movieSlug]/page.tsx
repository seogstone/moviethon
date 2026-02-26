import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityPanel } from "@/components/CommunityPanel";
import { getAuthIdentityFromSession } from "@/lib/auth/user";
import { fallbackActorBySlug, fallbackActorMovies } from "@/lib/data/fallback";
import { getAppUserByAuth0Sub, getMovieByActorAndSlug, listMovieComments } from "@/lib/data/queries";
import { formatDate, formatScore } from "@/lib/format";
import type { Comment } from "@/lib/types";

export const dynamic = "force-dynamic";

interface MoviePageProps {
  params: Promise<{ actorSlug: string; movieSlug: string }>;
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { actorSlug, movieSlug } = await params;

  let actor = fallbackActorBySlug(actorSlug);
  const fallbackMovie = fallbackActorMovies(actorSlug).find((movie) => movie.slug === movieSlug) ?? null;
  let movie = fallbackMovie;
  let comments: Comment[] = [];
  let authIdentity: Awaited<ReturnType<typeof getAuthIdentityFromSession>> = null;
  let appUser: Awaited<ReturnType<typeof getAppUserByAuth0Sub>> = null;

  try {
    authIdentity = await getAuthIdentityFromSession();
    if (authIdentity) {
      appUser = await getAppUserByAuth0Sub(authIdentity.auth0Sub);
    }
  } catch {
    authIdentity = null;
    appUser = null;
  }

  try {
    const fromDb = await getMovieByActorAndSlug(actorSlug, movieSlug, appUser?.id ?? null);
    if (fromDb) {
      actor = fromDb.actor;
      movie = fromDb.movie;
      const commentResult = await listMovieComments(fromDb.movie.id, 1, 20);
      comments = commentResult.comments;
    }
  } catch {
    // fallback mode
  }

  if (!actor || !movie) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 rounded-3xl border border-[#d9d7f2] bg-white p-6 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-8">
        <Link
          href={`/actors/${actor.slug}`}
          className="inline-flex items-center text-sm font-medium text-[#676489] transition hover:text-[#1a1738]"
        >
          ← back to {actor.name}
        </Link>

        <div className="grid grid-cols-[140px,1fr] items-start gap-5 sm:grid-cols-[170px,1fr] lg:grid-cols-[190px,1fr]">
          <div
            className="aspect-[2/3] w-full rounded-2xl border border-[#e4e3f7] bg-no-repeat bg-center"
            style={{
              backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : "linear-gradient(160deg, #efeeff, #ffffff)",
              backgroundSize: "contain",
              backgroundColor: "#f3f2ff",
            }}
          />

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-[#1a1738]">{movie.title}</h1>
            <p className="text-sm text-[#676489]">
              {formatDate(movie.releaseDate)} • {movie.genres.join(" • ")}
            </p>
            <p className="text-base leading-7 text-[#4d4a6b]">{movie.synopsis ?? "Synopsis not available yet."}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">IMDb</div>
                <div className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(movie.ratings.imdbScore)}</div>
              </div>
              <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">your rating</div>
                <div className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(movie.ratings.ownerScore)}</div>
              </div>
              <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">community</div>
                <div className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(movie.ratings.communityAvg)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CommunityPanel
        movieId={movie.id}
        initialCommunityAvg={movie.ratings.communityAvg}
        initialCommunityCount={movie.ratings.communityCount}
        initialComments={comments}
        initialMyRating={movie.ratings.myRating ?? null}
        isAuthenticated={Boolean(authIdentity)}
        viewerDisplayName={authIdentity?.name ?? null}
      />
    </main>
  );
}
