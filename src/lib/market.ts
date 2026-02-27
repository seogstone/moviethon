import { roundToSingleDecimal } from "@/lib/ratings";
import type { ActorMarketMetric, HomepageMarketPayload } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MarketActorInput {
  actorId: string;
  actorSlug: string;
  actorName: string;
  movieIds: string[];
}

export interface MarketVoteInput {
  movieId: string;
  score: number;
  updatedAt: string;
}

export interface MarketCommentInput {
  movieId: string;
  createdAt: string;
}

export interface BuildActorMarketMetricsInput {
  actors: MarketActorInput[];
  votes: MarketVoteInput[];
  comments: MarketCommentInput[];
  windowDays: number;
  sparkDays: number;
  minVotesForDelta: number;
  now?: Date;
}

function average(scores: number[]): number | null {
  if (!scores.length) {
    return null;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return roundToSingleDecimal(total / scores.length);
}

function parseUtcStartOfDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function buildActorMarketMetrics(input: BuildActorMarketMetricsInput): ActorMarketMetric[] {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const currentWindowStartMs = nowMs - input.windowDays * DAY_MS;
  const previousWindowStartMs = nowMs - input.windowDays * 2 * DAY_MS;

  const sparkStartDayMs = parseUtcStartOfDay(new Date(nowMs - (input.sparkDays - 1) * DAY_MS));
  const sparkEndDayMs = sparkStartDayMs + input.sparkDays * DAY_MS;

  const votesByMovieId = new Map<string, MarketVoteInput[]>();
  for (const vote of input.votes) {
    const bucket = votesByMovieId.get(vote.movieId) ?? [];
    bucket.push(vote);
    votesByMovieId.set(vote.movieId, bucket);
  }

  const commentsByMovieId = new Map<string, MarketCommentInput[]>();
  for (const comment of input.comments) {
    const bucket = commentsByMovieId.get(comment.movieId) ?? [];
    bucket.push(comment);
    commentsByMovieId.set(comment.movieId, bucket);
  }

  const metrics: ActorMarketMetric[] = [];

  for (const actor of input.actors) {
    const movieIds = new Set(actor.movieIds);
    const actorVotes = actor.movieIds.flatMap((movieId) => votesByMovieId.get(movieId) ?? []);
    const actorComments = actor.movieIds.flatMap((movieId) => commentsByMovieId.get(movieId) ?? []);

    const allScores = actorVotes.map((vote) => vote.score);
    const currentVotes = actorVotes.filter((vote) => {
      const timestamp = new Date(vote.updatedAt).getTime();
      return timestamp >= currentWindowStartMs && timestamp <= nowMs;
    });
    const previousVotes = actorVotes.filter((vote) => {
      const timestamp = new Date(vote.updatedAt).getTime();
      return timestamp >= previousWindowStartMs && timestamp < currentWindowStartMs;
    });

    const currentScores = currentVotes.map((vote) => vote.score);
    const previousScores = previousVotes.map((vote) => vote.score);
    const currentAvg7d = average(currentScores);
    const previousAvg7d = average(previousScores);

    const gainerDelta7d =
      currentVotes.length >= input.minVotesForDelta &&
      previousVotes.length >= input.minVotesForDelta &&
      currentAvg7d !== null &&
      previousAvg7d !== null
        ? roundToSingleDecimal(currentAvg7d - previousAvg7d)
        : null;

    const activitySpark14d = Array.from({ length: input.sparkDays }, () => 0);
    for (const vote of actorVotes) {
      if (!movieIds.has(vote.movieId)) {
        continue;
      }

      const timestamp = new Date(vote.updatedAt).getTime();
      if (timestamp < sparkStartDayMs || timestamp >= sparkEndDayMs) {
        continue;
      }

      const index = Math.floor((timestamp - sparkStartDayMs) / DAY_MS);
      if (index >= 0 && index < activitySpark14d.length) {
        activitySpark14d[index] += 1;
      }
    }

    const comments7d = actorComments.filter((comment) => {
      const timestamp = new Date(comment.createdAt).getTime();
      return timestamp >= currentWindowStartMs && timestamp <= nowMs;
    }).length;

    metrics.push({
      actorId: actor.actorId,
      actorSlug: actor.actorSlug,
      actorName: actor.actorName,
      ratings7d: currentVotes.length,
      ratingsPrev7d: previousVotes.length,
      avgRatingAllTime: average(allScores),
      voteCountAllTime: allScores.length,
      currentAvg7d,
      previousAvg7d,
      gainerDelta7d,
      comments7d,
      activitySpark14d,
    });
  }

  return metrics;
}

function compareNullableNumberDesc(left: number | null, right: number | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

export function rankMarketLeaderboards(metrics: ActorMarketMetric[]): HomepageMarketPayload["leaderboards"] {
  const movers = [...metrics].sort((a, b) => {
    if (a.ratings7d !== b.ratings7d) {
      return b.ratings7d - a.ratings7d;
    }

    const avgCompare = compareNullableNumberDesc(a.avgRatingAllTime, b.avgRatingAllTime);
    if (avgCompare !== 0) {
      return avgCompare;
    }

    return a.actorName.localeCompare(b.actorName);
  });

  const gainers = [...metrics]
    .filter((actor) => actor.gainerDelta7d !== null && actor.gainerDelta7d > 0)
    .sort((a, b) => {
      const deltaCompare = compareNullableNumberDesc(a.gainerDelta7d, b.gainerDelta7d);
      if (deltaCompare !== 0) {
        return deltaCompare;
      }

      if (a.ratings7d !== b.ratings7d) {
        return b.ratings7d - a.ratings7d;
      }

      return a.actorName.localeCompare(b.actorName);
    });

  const discussed = [...metrics].sort((a, b) => {
    if (a.comments7d !== b.comments7d) {
      return b.comments7d - a.comments7d;
    }

    if (a.ratings7d !== b.ratings7d) {
      return b.ratings7d - a.ratings7d;
    }

    return a.actorName.localeCompare(b.actorName);
  });

  return { movers, gainers, discussed };
}
