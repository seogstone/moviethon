import Link from "next/link";

import { Sparkline } from "@/components/Sparkline";
import { formatScore } from "@/lib/format";
import type { ActorMarketMetric, HomepageMarketPayload } from "@/lib/types";

interface MarketDashboardProps {
  market: HomepageMarketPayload;
}

function deltaLabel(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function rowLink(metric: ActorMarketMetric): string {
  return `/actors/${metric.actorSlug}`;
}

export function MarketDashboard({ market }: MarketDashboardProps) {
  const movers = market.leaderboards.movers.slice(0, 6);
  const gainers = market.leaderboards.gainers.slice(0, 6);
  const discussed = market.leaderboards.discussed.slice(0, 6);
  const hasAnyActivity = market.actors.some((actor) => actor.ratings7d > 0 || actor.comments7d > 0);

  return (
    <section className="space-y-4 rounded-3xl border border-[#d9d7f2] bg-white p-5 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">market pulse</p>
        <h2 className="text-2xl font-semibold text-[#1a1738]">big movers and gainers</h2>
      </div>

      {!hasAnyActivity ? (
        <p className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4 text-sm text-[#676489]">
          not enough activity yet. once ratings and comments increase, movers and gainers will appear here.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">top movers (7d ratings)</h3>
            <ul className="mt-3 space-y-2">
              {movers.map((actor) => (
                <li key={actor.actorId} className="rounded-xl border border-[#e4e3f7] bg-white p-2.5">
                  <Link href={rowLink(actor)} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1738]">{actor.actorName}</p>
                      <p className="text-xs text-[#676489]">{actor.ratings7d} ratings</p>
                    </div>
                    <Sparkline points={actor.activitySpark14d} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">top gainers (7d delta)</h3>
            <ul className="mt-3 space-y-2">
              {gainers.length ? (
                gainers.map((actor) => (
                  <li key={actor.actorId} className="rounded-xl border border-[#e4e3f7] bg-white p-2.5">
                    <Link href={rowLink(actor)} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#1a1738]">{actor.actorName}</p>
                        <p className="text-xs text-[#676489]">
                          {formatScore(actor.currentAvg7d)} now vs {formatScore(actor.previousAvg7d)} prior
                        </p>
                      </div>
                      <span className="rounded-full bg-[#e9f9ee] px-2 py-0.5 text-xs font-semibold text-[#237a37]">
                        {deltaLabel(actor.gainerDelta7d)}
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-[#e4e3f7] bg-white p-2.5 text-xs text-[#676489]">
                  not enough vote depth for gainers yet.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">discussion heat (7d comments)</h3>
            <ul className="mt-3 space-y-2">
              {discussed.map((actor) => (
                <li key={actor.actorId} className="rounded-xl border border-[#e4e3f7] bg-white p-2.5">
                  <Link href={rowLink(actor)} className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#1a1738]">{actor.actorName}</p>
                    <span className="text-xs font-medium text-[#676489]">{actor.comments7d} comments</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
