"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MarketDashboard } from "@/components/MarketDashboard";
import { Sparkline } from "@/components/Sparkline";
import { formatScore } from "@/lib/format";
import type { Actor, ActorMarketMetric, HomepageMarketPayload } from "@/lib/types";

interface ActorDiscoveryProps {
  actors: Actor[];
  market: HomepageMarketPayload;
}

type ActorSortMode = "momentum" | "avg_rating" | "comments7d" | "name";
type ActorFilterMode = "all" | "active" | "rising" | "discussed";

function getMetricMap(metrics: ActorMarketMetric[]): Map<string, ActorMarketMetric> {
  const map = new Map<string, ActorMarketMetric>();
  for (const metric of metrics) {
    map.set(metric.actorId, metric);
  }

  return map;
}

export function ActorDiscovery({ actors, market }: ActorDiscoveryProps) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<ActorSortMode>("momentum");
  const [filterMode, setFilterMode] = useState<ActorFilterMode>("all");

  const metricByActorId = useMemo(() => getMetricMap(market.actors), [market.actors]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let next = actors.filter((actor) => {
      if (term && !actor.name.toLowerCase().includes(term)) {
        return false;
      }

      const metric = metricByActorId.get(actor.id);
      if (!metric) {
        return filterMode === "all";
      }

      if (filterMode === "active") {
        return metric.ratings7d > 0;
      }

      if (filterMode === "rising") {
        return metric.gainerDelta7d !== null && metric.gainerDelta7d > 0;
      }

      if (filterMode === "discussed") {
        return metric.comments7d > 0;
      }

      return true;
    });

    next = [...next].sort((left, right) => {
      const leftMetric = metricByActorId.get(left.id);
      const rightMetric = metricByActorId.get(right.id);

      if (sortMode === "name") {
        return left.name.localeCompare(right.name);
      }

      if (sortMode === "avg_rating") {
        const leftScore = leftMetric?.avgRatingAllTime ?? -1;
        const rightScore = rightMetric?.avgRatingAllTime ?? -1;
        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }
      }

      if (sortMode === "comments7d") {
        const leftComments = leftMetric?.comments7d ?? 0;
        const rightComments = rightMetric?.comments7d ?? 0;
        if (leftComments !== rightComments) {
          return rightComments - leftComments;
        }
      }

      if (sortMode === "momentum") {
        const leftRatings = leftMetric?.ratings7d ?? 0;
        const rightRatings = rightMetric?.ratings7d ?? 0;
        if (leftRatings !== rightRatings) {
          return rightRatings - leftRatings;
        }
      }

      return left.name.localeCompare(right.name);
    });

    return next;
  }, [actors, filterMode, metricByActorId, search, sortMode]);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-[#d9d7f2] bg-white p-8 shadow-[0_18px_50px_rgba(42,39,85,0.07)] sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#676489]">curated binge lists</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#1a1738] sm:text-5xl">moviethon</h1>
        <p className="mt-4 max-w-2xl text-base text-[#4d4a6b]">
          binge the best runs from your favorite actors. move decade by decade, compare scores, and build your next
          weekend watchlist.
        </p>

        <label className="mt-8 block max-w-xl">
          <span className="mb-2 block text-sm font-medium text-[#676489]">find an actor</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="search your next binge"
            className="w-full rounded-2xl border border-[#d9d7f2] bg-white px-4 py-3 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff] focus:ring-2 focus:ring-[#605bff]/20"
          />
        </label>
      </div>

      <MarketDashboard market={market} />

      <div className="grid gap-3 rounded-3xl border border-[#d9d7f2] bg-white p-4 shadow-[0_8px_18px_rgba(42,39,85,0.04)] md:grid-cols-[1fr,220px]">
        <div className="flex flex-wrap gap-2">
          {([
            { value: "all", label: "all" },
            { value: "active", label: "active" },
            { value: "rising", label: "rising" },
            { value: "discussed", label: "discussed" },
          ] as Array<{ value: ActorFilterMode; label: string }>).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilterMode(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filterMode === option.value
                  ? "border-[#605bff] bg-[#ecebff] text-[#2e2a87]"
                  : "border-[#d9d7f2] bg-white text-[#676489] hover:border-[#b9b6eb]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">sort actors</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as ActorSortMode)}
            className="w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff]"
          >
            <option value="momentum">momentum (7d ratings)</option>
            <option value="avg_rating">average user rating</option>
            <option value="comments7d">comments (7d)</option>
            <option value="name">name</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((actor) => {
          const metric = metricByActorId.get(actor.id);

          return (
            <Link
              key={actor.id}
              href={`/actors/${actor.slug}`}
              className="group overflow-hidden rounded-3xl border border-[#d9d7f2] bg-white shadow-[0_10px_24px_rgba(42,39,85,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(42,39,85,0.1)]"
            >
              <div
                className="aspect-[2/3] w-full border-b border-[#e4e3f7] bg-no-repeat bg-center"
                style={{
                  backgroundImage: actor.heroImage ? `url(${actor.heroImage})` : "linear-gradient(140deg, #efeeff, #f8f8ff)",
                  backgroundSize: "contain",
                  backgroundColor: "#f3f2ff",
                }}
              />
              <div className="space-y-2 p-4">
                <h2 className="text-xl font-semibold text-[#1a1738]">{actor.name}</h2>
                <p className="line-clamp-2 text-sm leading-6 text-[#4d4a6b]">{actor.bio ?? "No bio yet."}</p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-xl border border-[#e4e3f7] bg-[#f8f7ff] px-2 py-2 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">ratings 7d</p>
                    <p className="mt-1 text-xs font-semibold text-[#1a1738]">{metric?.ratings7d ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-[#e4e3f7] bg-[#f8f7ff] px-2 py-2 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">avg</p>
                    <p className="mt-1 text-xs font-semibold text-[#1a1738]">{formatScore(metric?.avgRatingAllTime ?? null)}</p>
                  </div>
                  <div className="rounded-xl border border-[#e4e3f7] bg-[#f8f7ff] px-2 py-2 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">comments 7d</p>
                    <p className="mt-1 text-xs font-semibold text-[#1a1738]">{metric?.comments7d ?? 0}</p>
                  </div>
                </div>

                {metric && (
                  <div className="flex items-center justify-between rounded-xl border border-[#e4e3f7] bg-[#f8f7ff] px-2.5 py-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">trend</span>
                    <Sparkline points={metric.activitySpark14d} />
                  </div>
                )}

                <p className="pt-1 text-sm font-medium text-[#605bff]">start binge →</p>
              </div>
            </Link>
          );
        })}
      </div>

      {!filtered.length && (
        <p className="rounded-2xl border border-[#d9d7f2] bg-white p-5 text-sm text-[#676489]">
          No actor found. Try a different search, filter, or sort.
        </p>
      )}
    </section>
  );
}
