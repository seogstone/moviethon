import "dotenv/config";

import { syncActorMovies } from "../src/lib/sync/actor-sync";

async function run() {
  const actorSlug = process.argv[2];
  if (!actorSlug) {
    throw new Error("Usage: npm run sync:actor -- <actor-slug>");
  }

  const result = await syncActorMovies(actorSlug);
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
