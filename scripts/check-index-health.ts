import "dotenv/config";

import { getIndexAnomalies, getIndexHealth } from "../src/lib/data/index-queries";

async function run() {
  const [health, anomalies] = await Promise.all([getIndexHealth(), getIndexAnomalies(10)]);

  console.log("Index health:");
  console.log(JSON.stringify(health, null, 2));

  console.log("\nTop anomalies:");
  console.log(JSON.stringify(anomalies, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
