import { ActorDiscovery } from "@/components/ActorDiscovery";
import { MarketOverview } from "@/components/MarketOverview";
import { fallbackFeaturedActors } from "@/lib/data/fallback";
import {
  getCommunityVelocityRows,
  getGlobalIndexHistory,
  getHomepageFilmTable,
  getLatestActorRankings,
  getLatestGenreRankings,
} from "@/lib/data/index-queries";
import { getHomepageMarketStats, listFeaturedActors } from "@/lib/data/queries";
import type { ChartRange, RankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseTab(raw: string | string[] | undefined): "all" | "gainers" | "decliners" | "volatile" | "trending" {
  if (typeof raw !== "string") {
    return "all";
  }
  if (raw === "gainers" || raw === "decliners" || raw === "volatile" || raw === "trending") {
    return raw;
  }
  return "all";
}

function parseGlobalRange(raw: string | string[] | undefined): ChartRange {
  if (typeof raw !== "string") {
    return "90d";
  }

  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "1y" || raw === "all") {
    return raw;
  }

  return "90d";
}

function globalRangeToDays(range: ChartRange): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
    case "all":
      return Number.POSITIVE_INFINITY;
    default:
      return 90;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filmTab = parseTab(params.tab);
  const globalRange = parseGlobalRange(params.range);

  let actors = fallbackFeaturedActors();
  const market = await getHomepageMarketStats({
    actorScope: "featured",
    windowDays: 7,
    sparkDays: 14,
    minVotesForDelta: 5,
  }).catch(() => ({
    generatedAt: new Date().toISOString(),
    windowDays: 7,
    sparkDays: 14,
    minVotesForDelta: 5,
    leaderboards: { movers: [], gainers: [], discussed: [] },
    actors: [],
  }));

  let globalHistory = await getGlobalIndexHistory(globalRangeToDays(globalRange)).catch(() => []);
  let filmRows: RankingRow[] = [];
  let actorRows: RankingRow[] = [];
  let genreRows: RankingRow[] = [];
  const communityRows = await getCommunityVelocityRows(25).catch(() => []);

  try {
    const fromDb = await listFeaturedActors();
    if (fromDb.length) {
      actors = fromDb;
    }
  } catch {
    // fallback actors
  }

  try {
    const [{ rows: filmTable }, actorPayload, genrePayload] = await Promise.all([
      getHomepageFilmTable({ tab: filmTab, limit: 25 }),
      getLatestActorRankings({ limit: 25, sortBy: "index", sortDir: "desc" }),
      getLatestGenreRankings({ limit: 25, sortBy: "index", sortDir: "desc" }),
    ]);

    const sparkByActorSlug = new Map(market.actors.map((metric) => [metric.actorSlug, metric.activitySpark14d]));
    actorRows = actorPayload.rows.map((row) => ({
      ...row,
      trendPoints: row.actorSlug ? sparkByActorSlug.get(row.actorSlug) : undefined,
    }));

    filmRows = filmTable;
    genreRows = genrePayload.rows;
  } catch {
    // fallback to empty ranking sections
  }

  if (!globalHistory.length) {
    globalHistory = [
      {
        asOfDate: new Date().toISOString().slice(0, 10),
        indexValue: 0,
        delta1d: null,
        delta7d: null,
        delta30d: null,
        volatility30d: null,
        volatilityClass: "insufficient",
        formulaVersion: null,
      },
    ];
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1680px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <MarketOverview
        activeFilmTab={filmTab}
        activeGlobalRange={globalRange}
        globalHistory={globalHistory}
        filmRows={filmRows}
        actorRows={actorRows}
        genreRows={genreRows}
        communityRows={communityRows}
      />
      <section id="actors" className="scroll-mt-24">
        <ActorDiscovery actors={actors} market={market} showHero={false} showMarketDashboard={false} />
      </section>
    </main>
  );
}
