import {
  createSyncRun,
  finishSyncRun,
  listActorMoviesForSync,
  updateActorHeroImage,
  updateMovieExternalData,
} from "@/lib/data/queries";
import {
  fetchOmdbByImdbId,
  fetchTmdbActorImageByName,
  fetchTmdbByImdbId,
  mergeExternalData,
} from "@/lib/sync/providers";

export interface SyncResult {
  actorSlug: string;
  synced: number;
  actorImageUpdated: boolean;
  failed: number;
  failures: Array<{ movieSlug: string; message: string }>;
}

export async function syncActorMovies(actorSlug: string): Promise<SyncResult> {
  const { actor, movies } = await listActorMoviesForSync(actorSlug);
  const syncRunId = await createSyncRun(actor.id);

  const failures: Array<{ movieSlug: string; message: string }> = [];
  let synced = 0;
  let actorImageUpdated = false;

  try {
    try {
      const actorImage = await fetchTmdbActorImageByName(actor.name);
      if (actorImage) {
        await updateActorHeroImage(actor.id, actorImage);
        actorImageUpdated = true;
      }
    } catch (error) {
      failures.push({
        movieSlug: "_actor_image_",
        message: error instanceof Error ? error.message : "Actor image sync failed",
      });
    }

    for (const movie of movies) {
      try {
        if (!movie.imdbId) {
          failures.push({ movieSlug: movie.slug, message: "Missing imdbId" });
          continue;
        }

        const [tmdb, omdb] = await Promise.all([
          fetchTmdbByImdbId(movie.imdbId),
          fetchOmdbByImdbId(movie.imdbId),
        ]);

        const merged = mergeExternalData(tmdb, omdb);
        await updateMovieExternalData(movie.id, merged);
        synced += 1;
      } catch (error) {
        failures.push({
          movieSlug: movie.slug,
          message: error instanceof Error ? error.message : "Unknown sync error",
        });
      }
    }

    const details = {
      actorSlug,
      synced,
      actorImageUpdated,
      failed: failures.length,
      failures,
    };

    await finishSyncRun(syncRunId, "success", details);

    return {
      actorSlug,
      synced,
      actorImageUpdated,
      failed: failures.length,
      failures,
    };
  } catch (error) {
    const details = {
      actorSlug,
      synced,
      failed: failures.length + 1,
      failures: [
        ...failures,
        {
          movieSlug: "*",
          message: error instanceof Error ? error.message : "Unknown sync error",
        },
      ],
    };

    await finishSyncRun(syncRunId, "failed", details);
    throw error;
  }
}
