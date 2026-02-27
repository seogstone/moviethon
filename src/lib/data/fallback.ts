import { actorSeeds, movieSeeds } from "@/lib/data/manual-seed";
import { rankMarketLeaderboards } from "@/lib/market";
import type { Actor, ActorMarketMetric, HomepageMarketPayload, MovieWithRatings } from "@/lib/types";

export function fallbackActors(): Actor[] {
  return actorSeeds
    .filter((actor) => actor.isFeatured)
    .map((actor) => ({
      id: actor.slug,
      slug: actor.slug,
      name: actor.name,
      heroImage: actor.heroImage,
      bio: actor.bio,
      isFeatured: actor.isFeatured,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function fallbackFeaturedActors(): Actor[] {
  return fallbackActors();
}

export function fallbackActorBySlug(slug: string): Actor | null {
  const actor = actorSeeds.find((item) => item.slug === slug);
  if (!actor) {
    return null;
  }

  return {
    id: actor.slug,
    slug: actor.slug,
    name: actor.name,
    heroImage: actor.heroImage,
    bio: actor.bio,
    isFeatured: actor.isFeatured,
  };
}

export function fallbackActorMovies(actorSlug: string): MovieWithRatings[] {
  const actor = fallbackActorBySlug(actorSlug);
  if (!actor) {
    return [];
  }

  return movieSeeds
    .filter((movie) => movie.actorSlug === actorSlug)
    .map((movie) => ({
      id: movie.slug,
      actorId: actor.id,
      slug: movie.slug,
      title: movie.title,
      releaseDate: movie.releaseDate,
      decade: Math.floor(new Date(movie.releaseDate).getUTCFullYear() / 10) * 10,
      genres: movie.genres,
      posterUrl: null,
      imdbId: movie.imdbId,
      tmdbId: null,
      synopsis: movie.synopsis,
      runtimeMinutes: null,
      ratings: {
        imdbScore: null,
        ownerScore: movie.ownerScore,
        communityAvg: 0,
        communityCount: 0,
      },
      curatedRank: movie.curatedRank,
    }))
    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
}

export function fallbackHomepageMarketPayload(
  actors: Actor[],
  options?: { windowDays?: number; sparkDays?: number; minVotesForDelta?: number },
): HomepageMarketPayload {
  const windowDays = options?.windowDays ?? 7;
  const sparkDays = options?.sparkDays ?? 14;
  const minVotesForDelta = options?.minVotesForDelta ?? 5;

  const metrics = actors.map(
    (actor) =>
      ({
        actorId: actor.id,
        actorSlug: actor.slug,
        actorName: actor.name,
        ratings7d: 0,
        ratingsPrev7d: 0,
        avgRatingAllTime: null,
        voteCountAllTime: 0,
        currentAvg7d: null,
        previousAvg7d: null,
        gainerDelta7d: null,
        comments7d: 0,
        activitySpark14d: Array.from({ length: sparkDays }, () => 0),
      }) satisfies ActorMarketMetric,
  );

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    sparkDays,
    minVotesForDelta,
    leaderboards: rankMarketLeaderboards(metrics),
    actors: metrics,
  };
}
