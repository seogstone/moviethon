import { RankingTable } from "@/components/RankingTable";
import { RankingsNav } from "@/components/RankingsNav";
import { getLatestFilmRankings } from "@/lib/data/index-queries";

export const dynamic = "force-dynamic";

interface FilmsRankingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FilmsRankingPage({ searchParams }: FilmsRankingPageProps) {
  const params = await searchParams;
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : undefined;

  let payload: Awaited<ReturnType<typeof getLatestFilmRankings>> = { rows: [], asOfDate: null };
  try {
    payload = await getLatestFilmRankings({
      limit: 50,
      sortBy: sortBy === "delta_7d" || sortBy === "volatility" || sortBy === "index" ? sortBy : "index",
      sortDir: "desc",
    });
  } catch {
    payload = { rows: [], asOfDate: null };
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3 panel-shell rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">rankings</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">films index leaderboard</h1>
        <RankingsNav activeHref="/rankings/films" />
      </div>

      <RankingTable title="films" rows={payload.rows} emptyMessage="No film index data yet." />
    </main>
  );
}
