import Link from "next/link";
import { notFound } from "next/navigation";

import { LineChart } from "@/components/LineChart";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieGridControls } from "@/components/MovieGridControls";
import { getCurrentAppUser } from "@/lib/auth/user";
import { fallbackActorBySlug, fallbackActorMovies } from "@/lib/data/fallback";
import { getActorInstrumentPanel, getActorSnapshotHistory } from "@/lib/data/index-queries";
import { getActorBySlug, listActorMovies, listWatchlistMovieIdsForUser } from "@/lib/data/queries";
import { filterAndSortMovies } from "@/lib/filter-sort";
import { formatDelta, formatIndexValue, formatScore } from "@/lib/format";
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
  let actorAnalytics: Awaited<ReturnType<typeof getActorInstrumentPanel>> = null;
  let snapshotRows: Awaited<ReturnType<typeof getActorSnapshotHistory>>["items"] = [];

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
      actorAnalytics = await getActorInstrumentPanel(fromDbActor.id);
      snapshotRows = (await getActorSnapshotHistory(fromDbActor.id, 1, 20)).items;
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
  const topGenres = actorAnalytics?.topGenres.slice(0, 3) ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <Link href="/" className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]">
          ← back to actors
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="flex items-start gap-4">
            <div
              className="h-28 w-28 shrink-0 rounded-full border border-[var(--border)] bg-[#0f1318] bg-cover bg-center"
              style={{ backgroundImage: actor.heroImage ? `url(${actor.heroImage})` : "none" }}
            />
            <div>
              <h1 className="text-4xl font-semibold text-[var(--foreground)]">{actor.name}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">{actor.bio ?? "actor profile and film contribution metrics."}</p>
              {topGenres.length ? (
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  top genres: {topGenres.map((genre) => genre.genre).join(" • ")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">actor index</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{formatIndexValue(actorAnalytics?.indexCurrent ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">rank</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{actorAnalytics?.rankPosition ?? "N/A"}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">rank change</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(actorAnalytics?.rankChange1d ?? null)}`}>
                {formatDelta(actorAnalytics?.rankChange1d ?? null)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">imdb avg</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{formatScore(rollup.imdbAvg)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">your curated avg</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{formatScore(rollup.ownerAvg)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">community avg</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{formatScore(rollup.communityAvg)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-shell rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">actor index history</h2>
          <p className="text-xs text-[var(--muted)]">7d | 30d | 90d | 1y | all</p>
        </div>
        <LineChart
          points={(actorAnalytics?.trend ?? []).map((point) => ({ label: point.date, value: point.value }))}
          height={260}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">film performance contribution</h2>
          <div className="table-shell thin-scroll rounded-xl">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>film</th>
                  <th className="num">role weight</th>
                  <th className="num">film index</th>
                  <th className="num">contribution %</th>
                  <th className="num">7d Δ</th>
                </tr>
              </thead>
              <tbody>
                {(actorAnalytics?.contributions ?? []).slice(0, 25).map((row) => (
                  <tr key={row.movieId}>
                    <td>
                      <Link href={`/movies/${row.movieSlug}?actor=${actor.slug}`} className="font-medium text-[var(--foreground)]">
                        {row.title}
                      </Link>
                    </td>
                    <td className="num">{row.roleWeight.toFixed(2)}</td>
                    <td className="num">{row.filmIndex.toFixed(1)}</td>
                    <td className="num">{row.contributionPercent.toFixed(1)}%</td>
                    <td className={`num ${deltaClass(row.filmDelta7d)}`}>{formatDelta(row.filmDelta7d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">historical snapshots</h2>
          <div className="table-shell thin-scroll rounded-xl">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>date</th>
                  <th className="num">index</th>
                  <th className="num">rank</th>
                  <th className="num">24h Δ</th>
                </tr>
              </thead>
              <tbody>
                {snapshotRows.map((row) => (
                  <tr key={row.asOfDate}>
                    <td>{row.asOfDate}</td>
                    <td className="num">{row.indexValue.toFixed(1)}</td>
                    <td className="num">{row.rankPosition ?? "N/A"}</td>
                    <td className={`num ${deltaClass(row.delta1d)}`}>{formatDelta(row.delta1d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">comparable actors</h2>
          <ul className="space-y-2">
            {(actorAnalytics?.peers ?? []).map((peer) => (
              <li key={peer.id}>
                <Link href={`/actors/${peer.slug}`} className="block rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">{peer.label}</p>
                    <p className="text-xs text-[var(--muted)]">sim {peer.similarityScore.toFixed(1)}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    index {formatIndexValue(peer.indexValue)} • 7d {formatDelta(peer.delta7d)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">actors also moving</h2>
          <ul className="space-y-2">
            {(actorAnalytics?.alsoMoving ?? []).map((peer) => (
              <li key={peer.id}>
                <Link href={`/actors/${peer.slug}`} className="block rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">{peer.label}</p>
                    <span className={`delta-badge ${deltaClass(peer.delta7d)}`}>{formatDelta(peer.delta7d)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>

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
