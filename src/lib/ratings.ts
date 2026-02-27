import type { ActorRollupRatings, MovieWithRatings } from "@/lib/types";

export function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeCommunityAverage(scores: number[]): number {
  if (!scores.length) {
    return 0;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return roundToSingleDecimal(total / scores.length);
}

export function normalizeScore(score: number): number {
  return Math.max(1, Math.min(10, roundToSingleDecimal(score)));
}

export interface VoteSnapshot {
  guestKeyHash: string;
  score: number;
}

export function applyVoteUpsert(votes: VoteSnapshot[], incoming: VoteSnapshot): VoteSnapshot[] {
  const index = votes.findIndex((vote) => vote.guestKeyHash === incoming.guestKeyHash);
  if (index === -1) {
    return [...votes, incoming];
  }

  const next = [...votes];
  next[index] = incoming;
  return next;
}

export interface UserVoteSnapshot {
  movieId: string;
  userId: string;
  score: number;
}

export function applyUserVoteUpsert(votes: UserVoteSnapshot[], incoming: UserVoteSnapshot): UserVoteSnapshot[] {
  const index = votes.findIndex(
    (vote) => vote.movieId === incoming.movieId && vote.userId === incoming.userId,
  );

  if (index === -1) {
    return [...votes, incoming];
  }

  const next = [...votes];
  next[index] = incoming;
  return next;
}

export function buildCommunityScores(
  userScores: number[],
  legacyGuestScores: number[],
  includeLegacyGuestVotes: boolean,
): number[] {
  if (!includeLegacyGuestVotes) {
    return [...userScores];
  }

  return [...userScores, ...legacyGuestScores];
}

export function computeActorRollupRatings(movies: MovieWithRatings[]): ActorRollupRatings {
  const imdbScores = movies
    .map((movie) => movie.ratings.imdbScore)
    .filter((score): score is number => typeof score === "number");
  const ownerScores = movies
    .map((movie) => movie.ratings.ownerScore)
    .filter((score): score is number => typeof score === "number");

  const communityVoteCount = movies.reduce((sum, movie) => sum + movie.ratings.communityCount, 0);
  const communityWeightedTotal = movies.reduce(
    (sum, movie) => sum + movie.ratings.communityAvg * movie.ratings.communityCount,
    0,
  );

  return {
    imdbAvg: imdbScores.length ? roundToSingleDecimal(imdbScores.reduce((sum, score) => sum + score, 0) / imdbScores.length) : null,
    imdbMovieCount: imdbScores.length,
    ownerAvg: ownerScores.length
      ? roundToSingleDecimal(ownerScores.reduce((sum, score) => sum + score, 0) / ownerScores.length)
      : null,
    ownerMovieCount: ownerScores.length,
    communityAvg: communityVoteCount ? roundToSingleDecimal(communityWeightedTotal / communityVoteCount) : null,
    communityVoteCount,
  };
}
