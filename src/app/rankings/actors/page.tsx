import { RankingTable } from "@/components/RankingTable";
import { RankingsNav } from "@/components/RankingsNav";
import { getLatestActorRankings } from "@/lib/data/index-queries";

export const dynamic = "force-dynamic";

export default async function ActorsRankingPage() {
  let payload: Awaited<ReturnType<typeof getLatestActorRankings>> = { rows: [], asOfDate: null };
  try {
    payload = await getLatestActorRankings({ limit: 50, sortBy: "index", sortDir: "desc" });
  } catch {
    payload = { rows: [], asOfDate: null };
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3 panel-shell rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">rankings</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">actors index leaderboard</h1>
        <RankingsNav activeHref="/rankings/actors" />
      </div>

      <RankingTable title="actors" rows={payload.rows} emptyMessage="No actor index data yet." />
    </main>
  );
}
