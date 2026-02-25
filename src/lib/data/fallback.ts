import { actorSeeds, movieSeeds } from "@/lib/data/manual-seed";
import type { Actor, MovieWithRatings } from "@/lib/types";

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
