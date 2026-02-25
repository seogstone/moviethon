import "dotenv/config";

import { actorSeeds, movieSeeds } from "../src/lib/data/manual-seed";
import {
  upsertActor,
  upsertActorMovie,
  upsertMovie,
  upsertOwnerRating,
} from "../src/lib/data/queries";

async function run() {
  const actorIdsBySlug = new Map<string, string>();

  for (const actor of actorSeeds) {
    const saved = await upsertActor(actor);
    actorIdsBySlug.set(saved.slug, saved.id);
  }

  for (const movie of movieSeeds) {
    const actorId = actorIdsBySlug.get(movie.actorSlug);
    if (!actorId) {
      throw new Error(`Missing actor for slug ${movie.actorSlug}`);
    }

    const movieId = await upsertMovie({
      slug: movie.slug,
      title: movie.title,
      releaseDate: movie.releaseDate,
      genres: movie.genres,
      imdbId: movie.imdbId,
      synopsis: movie.synopsis,
    });

    await upsertActorMovie({
      actorId,
      movieId,
      curatedRank: movie.curatedRank,
    });

    await upsertOwnerRating({
      actorId,
      movieId,
      score: movie.ownerScore,
    });
  }

  console.log(`Seed complete. Actors: ${actorSeeds.length}, Movies: ${movieSeeds.length}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
