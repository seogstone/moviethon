import Link from "next/link";

import { CommunityVelocityTable } from "@/components/CommunityVelocityTable";
import { LineChart } from "@/components/LineChart";
import { RankingTable } from "@/components/RankingTable";
import { formatDelta, formatIndexValue } from "@/lib/format";
import type { ChartRange, CommunityVelocityRow, GlobalIndexPoint, RankingRow } from "@/lib/types";

interface MarketOverviewProps {
  activeFilmTab: "all" | "gainers" | "decliners" | "volatile" | "trending";
  activeGlobalRange: ChartRange;
  globalHistory: GlobalIndexPoint[];
  filmRows: RankingRow[];
  actorRows: RankingRow[];
  genreRows: RankingRow[];
  communityRows: CommunityVelocityRow[];
}

const filmTabs: Array<{ key: MarketOverviewProps["activeFilmTab"]; label: string }> = [
  { key: "all", label: "all" },
  { key: "gainers", label: "gainers" },
  { key: "decliners", label: "decliners" },
  { key: "volatile", label: "volatile" },
  { key: "trending", label: "trending" },
];

const globalRanges: Array<{ key: ChartRange; label: string }> = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "1y", label: "1y" },
  { key: "all", label: "all" },
];

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

function buildHomeHref(tab: MarketOverviewProps["activeFilmTab"], range: ChartRange): string {
  const params = new URLSearchParams();
  if (tab !== "all") {
    params.set("tab", tab);
  }
  if (range !== "90d") {
    params.set("range", range);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

export function MarketOverview({
  activeFilmTab,
  activeGlobalRange,
  globalHistory,
  filmRows,
  actorRows,
  genreRows,
  communityRows,
}: MarketOverviewProps) {
  const latest = globalHistory[0] ?? null;
  const chartPoints = globalHistory
    .slice()
    .reverse()
    .map((point) => ({
      label: point.asOfDate,
      value: point.indexValue,
    }));

  return (
    <section className="space-y-6">
      <section className="panel-shell rounded-2xl p-4" aria-label="jump links">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>jump to</span>
          <a className="jump-link" href="#global-trend">
            global trend
          </a>
          <a className="jump-link" href="#film-rankings">
            films
          </a>
          <a className="jump-link" href="#actor-momentum">
            actors
          </a>
          <a className="jump-link" href="#genre-performance">
            genres
          </a>
          <a className="jump-link" href="#community-velocity">
            community
          </a>
          <a className="jump-link" href="#methodology">
            methodology
          </a>
        </div>
      </section>

      <section id="global-trend" className="grid gap-4 lg:grid-cols-12 scroll-mt-24">
        <div className="panel-shell rounded-2xl p-5 lg:col-span-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">moviethon index</p>
          <p className="mt-3 text-5xl font-semibold text-[var(--foreground)]">{formatIndexValue(latest?.indexValue ?? null)}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">24h</p>
              <p className={`mt-1 text-sm font-semibold ${deltaClass(latest?.delta1d ?? null)}`}>{formatDelta(latest?.delta1d ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">7d</p>
              <p className={`mt-1 text-sm font-semibold ${deltaClass(latest?.delta7d ?? null)}`}>{formatDelta(latest?.delta7d ?? null)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0f1318] p-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">30d</p>
              <p className={`mt-1 text-sm font-semibold ${deltaClass(latest?.delta30d ?? null)}`}>{formatDelta(latest?.delta30d ?? null)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            volatility <span className="volatility-badge ml-1">{latest?.volatilityClass ?? "insufficient"}</span>
          </p>
        </div>

        <div className="panel-shell rounded-2xl p-4 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">global trend</h2>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
              {globalRanges.map((range, index) => {
                const isActive = activeGlobalRange === range.key;
                return (
                  <div key={range.key} className="flex items-center gap-2">
                    {index > 0 ? <span className="text-[var(--muted)]">|</span> : null}
                    <Link
                      href={buildHomeHref(activeFilmTab, range.key)}
                      className={isActive ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {range.label}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
          <LineChart points={chartPoints} height={240} interactive />
        </div>
      </section>

      <section id="film-rankings" className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">film rankings</h2>
          <div className="flex flex-wrap gap-2">
            {filmTabs.map((tab) => (
              <Link
                key={tab.key}
                href={buildHomeHref(tab.key, activeGlobalRange)}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.1em] ${
                  activeFilmTab === tab.key
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:bg-[#171d25] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        <RankingTable title="films" rows={filmRows} emptyMessage="not enough film activity yet." />
      </section>

      <section id="actor-momentum" className="scroll-mt-24">
        <RankingTable title="actor momentum" rows={actorRows} emptyMessage="not enough actor activity yet." />
      </section>

      <section id="genre-performance" className="scroll-mt-24">
        <RankingTable title="genre performance" rows={genreRows} emptyMessage="not enough genre activity yet." />
      </section>

      <section id="community-velocity" className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">community velocity</h2>
          <p className="text-xs text-[var(--muted)]">24h signal</p>
        </div>
        <CommunityVelocityTable rows={communityRows} />
      </section>

      <section id="methodology" className="panel-shell rounded-2xl p-4 sm:p-5 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">methodology</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              index inputs combine bayesian quality, engagement velocity, recency weighting, and external signals.
            </p>
          </div>
          <Link
            href="/methodology"
            className="rounded-full border border-[var(--accent)] px-4 py-2 text-xs uppercase tracking-[0.1em] text-[var(--accent-highlight)]"
          >
            view methodology
          </Link>
        </div>
      </section>
    </section>
  );
}
