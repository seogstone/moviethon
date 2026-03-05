import "dotenv/config";

import { execSync } from "node:child_process";

function step(command: string): void {
  console.log(`\n[seed:v2-demo] ${command}`);
  execSync(command, { stdio: "inherit" });
}

function run() {
  const includeCuratedSeed = process.argv.includes("--with-seed");
  if (includeCuratedSeed) {
    step("npm run seed");
  } else {
    console.log("[seed:v2-demo] skipping `npm run seed` (existing DB-safe mode). pass --with-seed to include it.");
  }
  step("npm run seed:dummy-community");
  step("npm run index:backfill -- 45");
  step("npm run index:health");
}

try {
  run();
  console.log("\nV2 demo seed complete.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
