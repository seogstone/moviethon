import { RankingTable } from "@/components/RankingTable";
import { RankingsNav } from "@/components/RankingsNav";
import { getLatestMoverRankings } from "@/lib/data/index-queries";

export const dynamic = "force-dynamic";

export default async function GainersRankingPage() {
  let payload: Awaited<ReturnType<typeof getLatestMoverRankings>> = { rows: [], asOfDate: null };
  try {
    payload = await getLatestMoverRankings({ type: "gainers", window: "7d", limit: 50 });
  } catch {
    payload = { rows: [], asOfDate: null };
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3 panel-shell rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">rankings</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">top gainers (7d)</h1>
        <RankingsNav activeHref="/rankings/gainers" />
      </div>

      <RankingTable title="gainers" rows={payload.rows} emptyMessage="No gainer data yet." />
    </main>
  );
}
