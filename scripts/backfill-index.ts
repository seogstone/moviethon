import "dotenv/config";

import { runDailyIndexPipeline } from "../src/lib/index/run-daily-index";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function run() {
  const daysBackArg = process.argv[2];
  const daysBack = Math.min(180, Math.max(1, Number(daysBackArg ?? "45") || 45));

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const results: Array<{ asOfDate: string; filmRows: number; actorRows: number; genreRows: number }> = [];

  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const asOfDate = new Date(todayUtc);
    asOfDate.setUTCDate(asOfDate.getUTCDate() - i);

    const result = await runDailyIndexPipeline(asOfDate);
    results.push({
      asOfDate: result.asOfDate,
      filmRows: result.filmRows,
      actorRows: result.actorRows,
      genreRows: result.genreRows,
    });

    console.log(
      `[index:backfill] ${toIsoDate(asOfDate)} film=${result.filmRows} actor=${result.actorRows} genre=${result.genreRows}`,
    );
  }

  console.log(`Backfill complete. Days processed: ${results.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
