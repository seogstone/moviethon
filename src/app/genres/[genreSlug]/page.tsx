import Link from "next/link";
import { notFound } from "next/navigation";

import { LineChart } from "@/components/LineChart";
import { RankingTable } from "@/components/RankingTable";
import {
  getGenreActorExposure,
  getGenreHistory,
  getGenreInstrumentPanel,
  getGenreTopFilms,
  getRelatedGenres,
} from "@/lib/data/index-queries";
import { formatDelta, formatIndexValue } from "@/lib/format";
import type { RankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface GenrePageProps {
  params: Promise<{ genreSlug: string }>;
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

export default async function GenrePage({ params }: GenrePageProps) {
  const { genreSlug } = await params;

  const payload = await getGenreInstrumentPanel(genreSlug).catch(() => null);
  if (!payload) {
    notFound();
  }

  const [history, topFilms, actorExposure, related] = await Promise.all([
    getGenreHistory(genreSlug, 90).catch(() => []),
    getGenreTopFilms(genreSlug, 25).catch(() => []),
    getGenreActorExposure(genreSlug, 12).catch(() => []),
    getRelatedGenres(genreSlug, 8).catch(() => []),
  ]);

  const topFilmRows: RankingRow[] = topFilms.map((film) => ({
    id: film.id,
    label: film.label,
    slug: film.slug,
    entityType: "film",
    actorSlug: film.actorSlug,
    actorName: film.actorName,
    indexValue: film.indexValue,
    delta1d: null,
    delta7d: film.delta7d,
    delta30d: null,
    rankPosition: film.rankPosition,
    rankChange1d: null,
    volatilityClass: film.volatilityClass,
    asOfDate: history[0]?.asOfDate ?? "",
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <Link href="/rankings/genres" className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]">
          ← back to genres
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">genre</p>
            <h1 className="mt-1 text-4xl font-semibold text-[var(--foreground)]">{payload.genre}</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {topFilms.length} active films tracked in this genre.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">index</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{formatIndexValue(payload.indexCurrent)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">rank</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{payload.rankPosition ?? "N/A"}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">rank change</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(payload.rankChange1d)}`}>{formatDelta(payload.rankChange1d)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">24h</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(payload.delta1d)}`}>{formatDelta(payload.delta1d)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">7d</p>
              <p className={`mt-1 text-xl font-semibold ${deltaClass(payload.delta7d)}`}>{formatDelta(payload.delta7d)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">volatility</p>
              <p className="mt-1 text-sm font-semibold uppercase text-[var(--volatility)]">{payload.volatilityClass}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-shell rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">genre index history</h2>
          <p className="text-xs text-[var(--muted)]">7d | 30d | 90d | 1y | all</p>
        </div>
        <LineChart
          points={history.slice().reverse().map((point) => ({ label: point.asOfDate, value: point.indexValue }))}
          height={280}
        />
      </section>

      <RankingTable title="top films in genre" rows={topFilmRows} emptyMessage="not enough film signal in this genre." />

      <section className="grid gap-4 xl:grid-cols-3">
        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">actor exposure</h2>
          <div className="table-shell thin-scroll rounded-xl">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>actor</th>
                  <th className="num">% contribution</th>
                  <th className="num">avg film index</th>
                  <th className="num">actor index</th>
                </tr>
              </thead>
              <tbody>
                {actorExposure.map((row) => (
                  <tr key={row.actorId}>
                    <td>
                      <Link href={`/actors/${row.actorSlug}`} className="font-medium text-[var(--foreground)]">
                        {row.actorName}
                      </Link>
                    </td>
                    <td className="num">{row.contributionPercent.toFixed(1)}%</td>
                    <td className="num">{row.avgFilmIndex.toFixed(1)}</td>
                    <td className="num">{row.actorIndex === null ? "N/A" : row.actorIndex.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">also trending genres</h2>
          <ul className="space-y-2">
            {related.map((genre) => (
              <li key={genre.id}>
                <Link href={`/genres/${genre.slug}`} className="block rounded-lg border border-[var(--border)] bg-[#0f1318] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">{genre.label}</p>
                    <span className={`delta-badge ${deltaClass(genre.delta7d)}`}>{formatDelta(genre.delta7d)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
