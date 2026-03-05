import "dotenv/config";

import { randomToken, sha256 } from "../src/lib/crypto";
import { getSupabaseServiceClient } from "../src/lib/data/supabase";

const DUMMY_USER_PREFIX = "dummy|seed-user-";
const REPORT_REASONS = [
  "spam",
  "off-topic",
  "abusive language",
  "duplicate",
  "misleading info",
];

const OWNER_SCORE_MIN = 6.0;
const OWNER_SCORE_MAX = 9.8;
const COMMENT_REPORT_RATE = 0.15;
const COMMENT_HIDE_RATE = 0.04;
const COMMENT_DELETE_RATE = 0.02;
const WRITE_BATCH_SIZE = 500;

function randomScore(): number {
  const raw = OWNER_SCORE_MIN + Math.random() * (OWNER_SCORE_MAX - OWNER_SCORE_MIN);
  return Math.round(raw * 10) / 10;
}

function randomReason(): string {
  return REPORT_REASONS[Math.floor(Math.random() * REPORT_REASONS.length)];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function run() {
  const supabase = getSupabaseServiceClient();

  const { data: actorMovieRows, error: actorMovieError } = await supabase
    .from("actor_movies")
    .select("actor_id,movie_id");
  if (actorMovieError) {
    throw actorMovieError;
  }

  const ownerRatingsPayload = (actorMovieRows ?? []).map((row) => ({
    actor_id: String(row.actor_id),
    movie_id: String(row.movie_id),
    score: randomScore(),
    updated_at: new Date().toISOString(),
  }));

  for (const chunk of chunkArray(ownerRatingsPayload, WRITE_BATCH_SIZE)) {
    const { error } = await supabase.from("owner_ratings").upsert(chunk, { onConflict: "actor_id,movie_id" });
    if (error) {
      throw error;
    }
  }

  const { data: dummyUsers, error: dummyUsersError } = await supabase
    .from("app_users")
    .select("id")
    .ilike("auth0_sub", `${DUMMY_USER_PREFIX}%`);
  if (dummyUsersError) {
    throw dummyUsersError;
  }

  const dummyUserIds = (dummyUsers ?? []).map((row) => String(row.id));
  if (!dummyUserIds.length) {
    throw new Error("No dummy users found. Run seed:dummy-community first.");
  }

  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("id,user_id")
    .in("user_id", dummyUserIds);
  if (commentsError) {
    throw commentsError;
  }

  const dummyCommentIds = (comments ?? []).map((row) => String(row.id));

  if (dummyCommentIds.length) {
    for (const chunk of chunkArray(dummyCommentIds, WRITE_BATCH_SIZE)) {
      const { error } = await supabase
        .from("comments")
        .update({
          status: "visible",
          updated_at: new Date().toISOString(),
        })
        .in("id", chunk);
      if (error) {
        throw error;
      }
    }
  }

  const { error: clearReportsError } = await supabase.from("comment_reports").delete().not("id", "is", null);
  if (clearReportsError) {
    throw clearReportsError;
  }

  const shuffledCommentIds = shuffle(dummyCommentIds);
  const reportCount = Math.floor(shuffledCommentIds.length * COMMENT_REPORT_RATE);
  const hideCount = Math.floor(shuffledCommentIds.length * COMMENT_HIDE_RATE);
  const deleteCount = Math.floor(shuffledCommentIds.length * COMMENT_DELETE_RATE);

  const reportIds = shuffledCommentIds.slice(0, reportCount);
  const hideIds = shuffledCommentIds.slice(reportCount, reportCount + hideCount);
  const deleteIds = shuffledCommentIds.slice(reportCount + hideCount, reportCount + hideCount + deleteCount);

  const reportRows = reportIds.map((commentId) => ({
    comment_id: commentId,
    reason: randomReason(),
    reporter_key_hash: sha256(randomToken(16)),
    created_at: new Date().toISOString(),
  }));

  for (const chunk of chunkArray(reportRows, WRITE_BATCH_SIZE)) {
    if (!chunk.length) {
      continue;
    }
    const { error } = await supabase.from("comment_reports").insert(chunk);
    if (error) {
      throw error;
    }
  }

  for (const chunk of chunkArray(hideIds, WRITE_BATCH_SIZE)) {
    if (!chunk.length) {
      continue;
    }
    const { error } = await supabase
      .from("comments")
      .update({
        status: "hidden",
        updated_at: new Date().toISOString(),
      })
      .in("id", chunk);
    if (error) {
      throw error;
    }
  }

  for (const chunk of chunkArray(deleteIds, WRITE_BATCH_SIZE)) {
    if (!chunk.length) {
      continue;
    }
    const { error } = await supabase
      .from("comments")
      .update({
        status: "deleted",
        body: "[deleted by author]",
        updated_at: new Date().toISOString(),
      })
      .in("id", chunk);
    if (error) {
      throw error;
    }
  }

  console.log(
    `Dummy system seed complete. OwnerRatings: ${ownerRatingsPayload.length}, Reports: ${reportRows.length}, HiddenComments: ${hideIds.length}, DeletedComments: ${deleteIds.length}`,
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
