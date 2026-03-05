import { RankingTable } from "@/components/RankingTable";
import { RankingsNav } from "@/components/RankingsNav";
import { getLatestGenreRankings } from "@/lib/data/index-queries";

export const dynamic = "force-dynamic";

export default async function GenresRankingPage() {
  let payload: Awaited<ReturnType<typeof getLatestGenreRankings>> = { rows: [], asOfDate: null };
  try {
    payload = await getLatestGenreRankings({ limit: 50, sortBy: "index", sortDir: "desc" });
  } catch {
    payload = { rows: [], asOfDate: null };
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3 panel-shell rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">rankings</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">genres index leaderboard</h1>
        <RankingsNav activeHref="/rankings/genres" />
      </div>

      <RankingTable title="genres" rows={payload.rows} emptyMessage="No genre index data yet." />
    </main>
  );
}
