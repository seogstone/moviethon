import "dotenv/config";

import { runDailyIndexPipeline } from "../src/lib/index/run-daily-index";

async function main() {
  const asOfDate = process.argv[2];
  const result = await runDailyIndexPipeline(asOfDate);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
