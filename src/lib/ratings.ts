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
