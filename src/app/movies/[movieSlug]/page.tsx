import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { LineChart } from "@/components/LineChart";
import { MovieEngagementSection } from "@/components/MovieEngagementSection";
import { WatchlistToggle } from "@/components/WatchlistToggle";
import { getAuthIdentityFromSession } from "@/lib/auth/user";
import {
  getAlsoMovingFilms,
  getComparableFilms,
  getFilmCommunityVelocity,
  getFilmInstrumentPanel,
  getFilmPerformanceSnapshots,
  getMovieIndexHistory,
} from "@/lib/data/index-queries";
import { getSupabaseServiceClient } from "@/lib/data/supabase";
import { fallbackMovieBySlug } from "@/lib/data/fallback";
import { getAppUserByAuth0Sub, getMovieBySlug, isMovieInWatchlist, listMovieComments } from "@/lib/data/queries";
import { formatDate, formatDelta, formatIndexValue } from "@/lib/format";
import type { Comment } from "@/lib/types";
import { fetchTmdbWatchProviders } from "@/lib/watch-providers";

export const dynamic = "force-dynamic";

interface MoviePageProps {
  params: Promise<{ movieSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeCountryCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }

  return code;
}

function deltaClass(value: number | null): string {
  if (value === null) {
    return "delta-neutral";
  }
  if (value > 0) {
    return "delta-positive";
  }
  if (value < 0) {
    return "delta-negative";
  }
  return "delta-neutral";
}

async function getMovieActorContributionRows(movieId: string, filmIndex: number | null) {
  const supabase = getSupabaseServiceClient();
  const [{ data: actorMovies, error: actorMoviesError }, { data: roleRows, error: roleRowsError }] = await Promise.all([
    supabase.from("actor_movies").select("actor_id,actor:actors(slug,name)").eq("movie_id", movieId),
    supabase.from("actor_movie_role_weights").select("actor_id,role_weight").eq("movie_id", movieId),
  ]);

  if (actorMoviesError) {
    throw actorMoviesError;
  }

  if (roleRowsError) {
    throw roleRowsError;
  }

  const roleWeightByActor = new Map<string, number>();
  for (const row of (roleRows ?? []) as Array<{ actor_id: string; role_weight: number }>) {
    roleWeightByActor.set(String(row.actor_id), Number(row.role_weight));
  }

  return ((actorMovies ?? []) as Array<{ actor_id: string; actor?: { slug?: string; name?: string } | null }>)
    .map((row) => {
      const actorId = String(row.actor_id);
      const roleWeight = roleWeightByActor.get(actorId) ?? 1;
      return {
        actorId,
        actorSlug: row.actor?.slug ? String(row.actor.slug) : actorId,
        actorName: row.actor?.name ? String(row.actor.name) : "actor",
        roleWeight,
        derivedImpact: filmIndex === null ? null : Number((filmIndex * roleWeight).toFixed(2)),
      };
    })
    .sort((left, right) => right.roleWeight - left.roleWeight);
}

export default async function MoviePage({ params, searchParams }: MoviePageProps) {
  const { movieSlug } = await params;
  const rawSearchParams = await searchParams;
  const requestHeaders = await headers();
  const visitorRegion = normalizeCountryCode(requestHeaders.get("x-vercel-ip-country")) ?? "US";
  const preferredActorSlug = typeof rawSearchParams.actor === "string" ? rawSearchParams.actor : null;

  const fallbackEntry = fallbackMovieBySlug(movieSlug);
  let movie = fallbackEntry?.movie ?? null;
  let linkedActors = fallbackEntry?.actor ? [fallbackEntry.actor] : [];
  let primaryActor = fallbackEntry?.actor ?? null;
  let comments: Comment[] = [];
  let watchProviders: Awaited<ReturnType<typeof fetchTmdbWatchProviders>> = null;
  let watchProviderRegion = visitorRegion;
  let inWatchlist = false;
  let authIdentity: Awaited<ReturnType<typeof getAuthIdentityFromSession>> = null;
  let appUser: Awaited<ReturnType<typeof getAppUserByAuth0Sub>> = null;

  let instrument = await getFilmInstrumentPanel(movie?.id ?? "").catch(() => null);
  let history = movie ? await getMovieIndexHistory(movie.id, 90).catch(() => []) : [];
  let snapshots = movie
    ? await getFilmPerformanceSnapshots(movie.id, 1, 20).catch(() => ({ items: [], page: 1, pageSize: 20, total: 0 }))
    : { items: [], page: 1, pageSize: 20, total: 0 };
  let comparable = movie ? await getComparableFilms(movie.id, 8).catch(() => []) : [];
  let alsoMoving = movie ? await getAlsoMovingFilms(movie.id, 8).catch(() => []) : [];
  let communityVelocity = movie
    ? await getFilmCommunityVelocity(movie.id).catch(() => ({ ratings24h: 0, comments24h: 0, velocityRatio: null, trend: [] }))
    : { ratings24h: 0, comments24h: 0, velocityRatio: null, trend: [] };
  let actorContributionRows: Array<{ actorId: string; actorSlug: string; actorName: string; roleWeight: number; derivedImpact: number | null }> = [];

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
    const fromDb = await getMovieBySlug(movieSlug, appUser?.id ?? null);
    if (fromDb) {
      primaryActor = fromDb.primaryActor;
      linkedActors = fromDb.actors;
      movie = fromDb.movie;
      const commentResult = await listMovieComments(fromDb.movie.id, 1, 20);
      comments = commentResult.comments;
      if (appUser) {
        inWatchlist = await isMovieInWatchlist(appUser.id, fromDb.movie.id);
      }

      if (fromDb.movie.tmdbId) {
        watchProviders = await fetchTmdbWatchProviders(fromDb.movie.tmdbId, visitorRegion);
        if (!watchProviders && visitorRegion !== "US") {
          watchProviders = await fetchTmdbWatchProviders(fromDb.movie.tmdbId, "US");
          watchProviderRegion = "US";
        }
      }

      const [nextInstrument, nextHistory, nextSnapshots, nextComparable, nextMoving, nextCommunityVelocity, nextContributionRows] =
        await Promise.all([
          getFilmInstrumentPanel(fromDb.movie.id),
          getMovieIndexHistory(fromDb.movie.id, 90),
          getFilmPerformanceSnapshots(fromDb.movie.id, 1, 20),
          getComparableFilms(fromDb.movie.id, 8),
          getAlsoMovingFilms(fromDb.movie.id, 8),
          getFilmCommunityVelocity(fromDb.movie.id),
          getMovieActorContributionRows(fromDb.movie.id, null),
        ]);

      instrument = nextInstrument;
      history = nextHistory;
      snapshots = nextSnapshots;
      comparable = nextComparable;
      alsoMoving = nextMoving;
      communityVelocity = nextCommunityVelocity;
      actorContributionRows = await getMovieActorContributionRows(
        fromDb.movie.id,
        nextInstrument?.indexCurrent ?? null,
      );
      if (!actorContributionRows.length) {
        actorContributionRows = nextContributionRows;
      }
    }
  } catch {
    // fallback mode
  }

  if (!movie) {
    notFound();
  }

  const actor =
    (preferredActorSlug ? linkedActors.find((item) => item.slug === preferredActorSlug) : null) ??
    primaryActor ??
    linkedActors[0] ??
    null;

  const uniqueWatchProviders = watchProviders
    ? [
        ...new Map(
          [...watchProviders.flatrate, ...watchProviders.rent, ...watchProviders.buy].map((provider) => [
            provider.id,
            provider,
          ]),
        ).values(),
      ]
    : [];

  const indexPoints = history
    .slice()
    .reverse()
    .map((point) => ({ label: point.asOfDate, value: point.indexValue }));
  const rankPoints = history
    .slice()
    .reverse()
    .map((point) => ({ label: point.asOfDate, value: point.rankPosition ? -point.rankPosition : -999 }));
  const backHref = actor ? `/actors/${actor.slug}` : "/actors";
  const backLabel = actor ? `back to ${actor.name}` : "browse actors";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <Link
          href={backHref}
          className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← {backLabel}
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4">
              <div
                className="aspect-[2/3] w-full rounded-xl border border-[var(--border)] bg-[#0f1318] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : "none" }}
              />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-4xl font-semibold text-[var(--foreground)]">{movie.title}</h1>
                  <WatchlistToggle
                    movieId={movie.id}
                    initialInWatchlist={inWatchlist}
                    isAuthenticated={Boolean(authIdentity)}
                  />
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {formatDate(movie.releaseDate)} • {movie.genres.join(" • ")}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {movie.synopsis ?? "Synopsis not available yet."}
                </p>
                {linkedActors.length ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    with{" "}
                    {linkedActors.map((linkedActor, index) => (
                      <span key={linkedActor.id}>
                        {index > 0 ? " • " : ""}
                        <Link href={`/actors/${linkedActor.slug}`} className="text-[var(--foreground)] hover:underline">
                          {linkedActor.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:col-span-7 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">index</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{formatIndexValue(instrument?.indexCurrent ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">rank</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{instrument?.rankPosition ?? "N/A"}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">rank change</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(instrument?.rankChange1d ?? null)}`}>{formatDelta(instrument?.rankChange1d ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">24h Δ</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(instrument?.delta1d ?? null)}`}>{formatDelta(instrument?.delta1d ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">7d Δ</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(instrument?.delta7d ?? null)}`}>{formatDelta(instrument?.delta7d ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">volatility</p>
              <p className="mt-1 text-sm font-semibold uppercase text-[var(--volatility)]">
                {instrument?.volatilityClass ?? "insufficient"}
              </p>
            </div>
          </div>
        </div>

        {watchProviders && uniqueWatchProviders.length ? (
          <section className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-[#0f1318] p-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
              where to watch ({watchProviderRegion})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {uniqueWatchProviders.slice(0, 16).map((provider) => (
                <a
                  key={provider.id}
                  href={watchProviders.link ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-md border border-[var(--border)] bg-black"
                  title={provider.name}
                  aria-label={provider.name}
                >
                  <Image src={provider.logoUrl} alt={provider.name} width={34} height={34} className="h-[34px] w-[34px]" />
                </a>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)]">
              availability data by{" "}
              <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer" className="text-[var(--foreground)] underline">
                JustWatch
              </a>{" "}
              via TMDB.
            </p>
          </section>
        ) : null}
      </section>

      <section className="panel-shell rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">index history</h2>
          <p className="text-xs text-[var(--muted)]">7d | 30d | 90d | 1y | all</p>
        </div>
        <LineChart points={indexPoints} height={260} />
      </section>

      <section className="panel-shell rounded-2xl p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">historical rank position</h2>
        <LineChart points={rankPoints} height={210} stroke="var(--muted)" />
        <p className="mt-2 text-xs text-[var(--muted)]">
          rank reflects position among all tracked films on each snapshot date.
        </p>
      </section>

      <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">performance snapshots</h2>
        <div className="table-shell thin-scroll rounded-xl">
          <table className="mv-table">
            <thead>
              <tr>
                <th>date</th>
                <th className="num">index</th>
                <th className="num">rank</th>
                <th className="num">24h Δ</th>
                <th className="num">rating score</th>
                <th className="num">velocity score</th>
                <th className="num">external score</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.items.map((row) => (
                <tr key={row.asOfDate}>
                  <td>{row.asOfDate}</td>
                  <td className="num">{row.indexValue.toFixed(1)}</td>
                  <td className="num">{row.rankPosition ?? "N/A"}</td>
                  <td className={`num ${deltaClass(row.delta1d)}`}>{formatDelta(row.delta1d)}</td>
                  <td className="num">{row.ratingScore === null ? "N/A" : row.ratingScore.toFixed(1)}</td>
                  <td className="num">{row.velocityScore === null ? "N/A" : row.velocityScore.toFixed(1)}</td>
                  <td className="num">{row.externalScore === null ? "N/A" : row.externalScore.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">comparable films</h2>
          <div className="table-shell thin-scroll rounded-xl">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>film</th>
                  <th className="num">index</th>
                  <th className="num">7d Δ</th>
                  <th className="num">volatility</th>
                  <th className="num">rank</th>
                </tr>
              </thead>
              <tbody>
                {comparable.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={row.actorSlug ? `/movies/${row.slug}?actor=${row.actorSlug}` : `/movies/${row.slug}`}
                        className="font-medium text-[var(--foreground)]"
                      >
                        {row.label}
                      </Link>
                    </td>
                    <td className="num">{row.indexValue.toFixed(1)}</td>
                    <td className={`num ${deltaClass(row.delta7d)}`}>{formatDelta(row.delta7d)}</td>
                    <td className="num uppercase text-[var(--volatility)]">{row.volatilityClass}</td>
                    <td className="num">{row.rankPosition ?? "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">also moving</h2>
          <ul className="space-y-2">
            {alsoMoving.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.actorSlug ? `/movies/${row.slug}?actor=${row.actorSlug}` : `/movies/${row.slug}`}
                  className="block rounded-lg border border-[var(--border)] bg-[#0f1318] p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">{row.label}</p>
                    <span className={`delta-badge ${deltaClass(row.delta7d)}`}>{formatDelta(row.delta7d)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">actor contribution</h2>
          <div className="table-shell thin-scroll rounded-xl">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>actor</th>
                  <th className="num">role weight</th>
                  <th className="num">derived impact</th>
                </tr>
              </thead>
              <tbody>
                {actorContributionRows.map((row) => (
                  <tr key={row.actorId}>
                    <td>
                      <Link href={`/actors/${row.actorSlug}`} className="font-medium text-[var(--foreground)]">
                        {row.actorName}
                      </Link>
                    </td>
                    <td className="num">{row.roleWeight.toFixed(2)}</td>
                    <td className="num">{row.derivedImpact === null ? "N/A" : row.derivedImpact.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">community activity</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">new ratings</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{communityVelocity.ratings24h}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">velocity</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {communityVelocity.velocityRatio === null ? "N/A" : communityVelocity.velocityRatio.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">comments</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{communityVelocity.comments24h}</p>
            </div>
          </div>
          <LineChart
            points={communityVelocity.trend.map((value, index) => ({ label: `${index}`, value }))}
            height={120}
            stroke="var(--accent)"
          />
        </section>
      </section>

      <MovieEngagementSection
        movieId={movie.id}
        imdbScore={movie.ratings.imdbScore}
        initialCommunityAvg={movie.ratings.communityAvg}
        initialCommunityCount={movie.ratings.communityCount}
        initialComments={comments}
        initialMyRating={movie.ratings.myRating ?? null}
        isAuthenticated={Boolean(authIdentity)}
        viewerDisplayName={appUser?.displayName ?? appUser?.name ?? authIdentity?.name ?? null}
        viewerUserId={appUser?.id ?? null}
      />
    </main>
  );
}
