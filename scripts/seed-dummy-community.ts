import "dotenv/config";

import { randomUUID } from "node:crypto";

import { randomToken, sha256 } from "../src/lib/crypto";
import { getSupabaseServiceClient } from "../src/lib/data/supabase";

const USER_COUNT = 50;
const MIN_RATINGS_PER_USER = 6;
const MAX_RATINGS_PER_USER = 14;
const COMMENT_PROBABILITY = 0.38;
const ACTIVITY_DAYS_BACK = 30;
const DUMMY_USER_PREFIX = "dummy|seed-user-";

const firstNames = [
  "Alex",
  "Sam",
  "Taylor",
  "Jordan",
  "Morgan",
  "Casey",
  "Avery",
  "Riley",
  "Quinn",
  "Parker",
];

const lastNames = [
  "Walker",
  "Lee",
  "Perry",
  "Shaw",
  "Brooks",
  "Gray",
  "Hayes",
  "Wright",
  "Reed",
  "Stone",
];

const commentTemplates = [
  "rewatched this one and it still hits.",
  "great pacing and one of the better performances here.",
  "not my favorite in the catalog but still very watchable.",
  "this is a comfort rewatch for me.",
  "better than i remembered, especially on a second watch.",
  "solid movie night pick.",
  "really good chemistry in this cast.",
  "the ending works for me every time.",
  "strong performance and very rewatchable.",
  "surprisingly fun revisit.",
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(daysBack: number): string {
  const now = Date.now();
  const offsetMs = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offsetMs).toISOString();
}

function randomScore(): number {
  const raw = randInt(55, 99) / 10;
  return Math.round(raw * 10) / 10;
}

function sampleUnique<T>(items: T[], count: number): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  return clone.slice(0, Math.min(count, clone.length));
}

async function run() {
  const supabase = getSupabaseServiceClient();

  const { data: existingDummyUsers, error: existingUsersError } = await supabase
    .from("app_users")
    .select("id,auth0_sub")
    .ilike("auth0_sub", `${DUMMY_USER_PREFIX}%`);

  if (existingUsersError) {
    throw existingUsersError;
  }

  const existingIds = (existingDummyUsers ?? []).map((row) => String(row.id));
  if (existingIds.length) {
    const [{ error: deleteVotesError }, { error: deleteCommentsError }] = await Promise.all([
      supabase.from("user_votes").delete().in("user_id", existingIds),
      supabase.from("comments").delete().in("user_id", existingIds),
    ]);

    if (deleteVotesError) {
      throw deleteVotesError;
    }

    if (deleteCommentsError) {
      throw deleteCommentsError;
    }
  }

  const usersPayload = Array.from({ length: USER_COUNT }, (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const displayName = `${first.toLowerCase()}_${last.toLowerCase()}_${index + 1}`;
    const auth0Sub = `${DUMMY_USER_PREFIX}${String(index + 1).padStart(3, "0")}`;

    return {
      auth0_sub: auth0Sub,
      email: `${displayName}@moviethon.local`,
      name: `${first} ${last}`,
      display_name: displayName,
      bio: "dummy community account for local/qa analytics.",
      avatar_url: null as string | null,
      updated_at: new Date().toISOString(),
    };
  });

  const { data: upsertedUsers, error: upsertUsersError } = await supabase
    .from("app_users")
    .upsert(usersPayload, { onConflict: "auth0_sub" })
    .select("id,display_name,name");

  if (upsertUsersError) {
    throw upsertUsersError;
  }

  const users = (upsertedUsers ?? []).map((row) => ({
    id: String(row.id),
    displayName: (row.display_name ? String(row.display_name) : row.name ? String(row.name) : "member").trim() || "member",
  }));

  const { data: moviesRows, error: moviesError } = await supabase.from("movies").select("id,title");
  if (moviesError) {
    throw moviesError;
  }

  const movies = (moviesRows ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
  }));

  if (!movies.length) {
    throw new Error("No movies found. Seed actor/movie data first.");
  }

  const voteRows: Array<{
    movie_id: string;
    user_id: string;
    score: number;
    created_at: string;
    updated_at: string;
  }> = [];

  const commentRows: Array<{
    id: string;
    movie_id: string;
    display_name: string;
    body: string;
    status: "visible";
    delete_token_hash: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (const user of users) {
    const ratingCount = randInt(MIN_RATINGS_PER_USER, MAX_RATINGS_PER_USER);
    const ratedMovies = sampleUnique(movies, ratingCount);

    for (const movie of ratedMovies) {
      const timestamp = randomDateWithinDays(ACTIVITY_DAYS_BACK);
      voteRows.push({
        movie_id: movie.id,
        user_id: user.id,
        score: randomScore(),
        created_at: timestamp,
        updated_at: timestamp,
      });

      if (Math.random() <= COMMENT_PROBABILITY) {
        const commentTemplate = commentTemplates[randInt(0, commentTemplates.length - 1)];
        const commentTimestamp = randomDateWithinDays(ACTIVITY_DAYS_BACK);
        commentRows.push({
          id: randomUUID(),
          movie_id: movie.id,
          display_name: user.displayName,
          body: `${commentTemplate} (${movie.title.toLowerCase()})`,
          status: "visible",
          delete_token_hash: sha256(randomToken(24)),
          user_id: user.id,
          created_at: commentTimestamp,
          updated_at: commentTimestamp,
        });
      }
    }
  }

  if (voteRows.length) {
    const { error: votesError } = await supabase
      .from("user_votes")
      .upsert(voteRows, { onConflict: "movie_id,user_id" });
    if (votesError) {
      throw votesError;
    }
  }

  if (commentRows.length) {
    const { error: commentsError } = await supabase.from("comments").insert(commentRows);
    if (commentsError) {
      throw commentsError;
    }
  }

  console.log(
    `Dummy community seed complete. Users: ${users.length}, Ratings: ${voteRows.length}, Comments: ${commentRows.length}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
