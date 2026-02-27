import { computeCommunityAverage } from "@/lib/ratings";
import { buildActorMarketMetrics, rankMarketLeaderboards } from "@/lib/market";
import type {
  Actor,
  ActorMarketMetric,
  AppUser,
  Comment,
  HomepageMarketPayload,
  MyRatingItem,
  MyRatingsPage,
  Movie,
  MovieFilters,
  MovieWithRatings,
  PaginatedComments,
} from "@/lib/types";
import { filterAndSortMovies } from "@/lib/filter-sort";
import { getSupabaseServiceClient } from "@/lib/data/supabase";
import { includeLegacyGuestVotes } from "@/lib/env";

function mapActor(row: Record<string, unknown>): Actor {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    heroImage: row.hero_image ? String(row.hero_image) : null,
    bio: row.bio ? String(row.bio) : null,
    isFeatured: Boolean(row.is_featured),
  };
}

function mapMovieRow(row: Record<string, unknown>, actorId: string): Movie {
  return {
    id: String(row.id),
    actorId,
    slug: String(row.slug),
    title: String(row.title),
    releaseDate: String(row.release_date),
    decade: Number(row.decade),
    genres: Array.isArray(row.genres) ? (row.genres as string[]) : [],
    posterUrl: row.poster_url ? String(row.poster_url) : null,
    imdbId: row.imdb_id ? String(row.imdb_id) : null,
    tmdbId: typeof row.tmdb_id === "number" ? row.tmdb_id : row.tmdb_id ? Number(row.tmdb_id) : null,
    synopsis: row.synopsis ? String(row.synopsis) : null,
    runtimeMinutes: row.runtime_minutes ? Number(row.runtime_minutes) : null,
  };
}

function mapComment(row: Record<string, unknown>): Comment {
  const userId = row.user_id ? String(row.user_id) : null;

  return {
    id: String(row.id),
    movieId: String(row.movie_id),
    displayName: String(row.display_name),
    body: String(row.body),
    status: String(row.status) as Comment["status"],
    createdAt: String(row.created_at),
    userId,
    isVerifiedUser: Boolean(userId),
  };
}

function mapAppUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    auth0Sub: String(row.auth0_sub),
    email: row.email ? String(row.email) : null,
    name: row.name ? String(row.name) : null,
    displayName: row.display_name ? String(row.display_name) : null,
    bio: row.bio ? String(row.bio) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listFeaturedActors(search?: string): Promise<Actor[]> {
  const supabase = getSupabaseServiceClient();
  let query = supabase.from("actors").select("*").eq("is_featured", true).order("name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapActor(row));
}

export async function listAllActors(): Promise<Actor[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("actors").select("*").order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapActor(row));
}

interface HomepageMarketStatsOptions {
  actorScope?: "featured" | "all";
  windowDays?: number;
  sparkDays?: number;
  minVotesForDelta?: number;
}

export async function getHomepageMarketStats(
  options: HomepageMarketStatsOptions = {},
): Promise<HomepageMarketPayload> {
  const actorScope = options.actorScope ?? "featured";
  const windowDays = options.windowDays ?? 7;
  const sparkDays = options.sparkDays ?? 14;
  const minVotesForDelta = options.minVotesForDelta ?? 5;

  const actors = actorScope === "all" ? await listAllActors() : await listFeaturedActors();
  if (!actors.length) {
    return {
      generatedAt: new Date().toISOString(),
      windowDays,
      sparkDays,
      minVotesForDelta,
      leaderboards: {
        movers: [],
        gainers: [],
        discussed: [],
      },
      actors: [],
    };
  }

  const actorIds = actors.map((actor) => actor.id);
  const supabase = getSupabaseServiceClient();
  const { data: actorMovieRows, error: actorMovieError } = await supabase
    .from("actor_movies")
    .select("actor_id, movie_id")
    .in("actor_id", actorIds);

  if (actorMovieError) {
    throw actorMovieError;
  }

  const movieIds = Array.from(new Set((actorMovieRows ?? []).map((row) => String(row.movie_id))));
  if (!movieIds.length) {
    const emptyActors = actors.map(
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
      leaderboards: rankMarketLeaderboards(emptyActors),
      actors: emptyActors,
    };
  }

  const [votesResult, commentsResult] = await Promise.all([
    supabase.from("user_votes").select("movie_id, score, updated_at").in("movie_id", movieIds),
    supabase
      .from("comments")
      .select("movie_id, created_at")
      .eq("status", "visible")
      .in("movie_id", movieIds)
      .gte("created_at", new Date(Date.now() - sparkDays * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (votesResult.error) {
    throw votesResult.error;
  }

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  const moviesByActor = new Map<string, string[]>();
  for (const row of actorMovieRows ?? []) {
    const actorId = String(row.actor_id);
    const movieId = String(row.movie_id);
    const bucket = moviesByActor.get(actorId) ?? [];
    bucket.push(movieId);
    moviesByActor.set(actorId, bucket);
  }

  const metrics = buildActorMarketMetrics({
    actors: actors.map((actor) => ({
      actorId: actor.id,
      actorSlug: actor.slug,
      actorName: actor.name,
      movieIds: moviesByActor.get(actor.id) ?? [],
    })),
    votes: (votesResult.data ?? []).map((row) => ({
      movieId: String(row.movie_id),
      score: Number(row.score),
      updatedAt: String(row.updated_at),
    })),
    comments: (commentsResult.data ?? []).map((row) => ({
      movieId: String(row.movie_id),
      createdAt: String(row.created_at),
    })),
    windowDays,
    sparkDays,
    minVotesForDelta,
  });

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    sparkDays,
    minVotesForDelta,
    leaderboards: rankMarketLeaderboards(metrics),
    actors: metrics,
  };
}

export async function getActorBySlug(slug: string): Promise<Actor | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("actors").select("*").eq("slug", slug).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapActor(data) : null;
}

interface MovieBaseRow extends Record<string, unknown> {
  movie: Record<string, unknown>;
  curated_rank: number;
}

export async function listActorMovies(
  actorSlug: string,
  filters: MovieFilters = {},
  viewerUserId?: string | null,
): Promise<MovieWithRatings[]> {
  const actor = await getActorBySlug(actorSlug);
  if (!actor) {
    return [];
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("actor_movies")
    .select("curated_rank, movie:movies(*)")
    .eq("actor_id", actor.id)
    .order("curated_rank", { ascending: true });

  if (error) {
    throw error;
  }

  const movieRows = ((data ?? []) as unknown as MovieBaseRow[]).map((row) => {
    const movie = mapMovieRow(row.movie, actor.id);
    const imdbScore = row.movie.imdb_rating ? Number(row.movie.imdb_rating) : null;
    return { movie, curatedRank: Number(row.curated_rank), imdbScore };
  });

  const movieIds = movieRows.map((item) => item.movie.id);
  if (!movieIds.length) {
    return [];
  }

  const { data: ownerRatings, error: ownerError } = await supabase
    .from("owner_ratings")
    .select("movie_id, score")
    .eq("actor_id", actor.id)
    .in("movie_id", movieIds);

  if (ownerError) {
    throw ownerError;
  }

  const { data: userVotes, error: userVotesError } = await supabase
    .from("user_votes")
    .select("movie_id, user_id, score")
    .in("movie_id", movieIds);

  if (userVotesError) {
    throw userVotesError;
  }

  let guestVotes: Array<{ movie_id: string; score: number }> = [];
  if (includeLegacyGuestVotes()) {
    const { data, error: guestVotesError } = await supabase
      .from("guest_votes")
      .select("movie_id, score")
      .in("movie_id", movieIds);

    if (guestVotesError) {
      throw guestVotesError;
    }

    guestVotes = (data ?? []) as Array<{ movie_id: string; score: number }>;
  }

  const ownerByMovie = new Map<string, number>();
  const ownerRatingRows = (ownerRatings ?? []) as Array<{ movie_id: string; score: number }>;
  for (const row of ownerRatingRows) {
    ownerByMovie.set(String(row.movie_id), Number(row.score));
  }

  const scoreByMovie = new Map<string, number[]>();
  const myRatingByMovie = new Map<string, number>();

  const userVoteRows = (userVotes ?? []) as Array<{ movie_id: string; user_id: string; score: number }>;
  for (const vote of userVoteRows) {
    const movieId = String(vote.movie_id);
    const bucket = scoreByMovie.get(movieId) ?? [];
    bucket.push(Number(vote.score));
    scoreByMovie.set(movieId, bucket);

    if (viewerUserId && String(vote.user_id) === viewerUserId) {
      myRatingByMovie.set(movieId, Number(vote.score));
    }
  }

  for (const vote of guestVotes) {
    const movieId = String(vote.movie_id);
    const bucket = scoreByMovie.get(movieId) ?? [];
    bucket.push(Number(vote.score));
    scoreByMovie.set(movieId, bucket);
  }

  const normalized = movieRows.map((row) => {
    const movie = row.movie;
    const scores = scoreByMovie.get(movie.id) ?? [];

    return {
      ...movie,
      ratings: {
        imdbScore: row.imdbScore,
        ownerScore: ownerByMovie.get(movie.id) ?? null,
        communityAvg: computeCommunityAverage(scores),
        communityCount: scores.length,
        myRating: myRatingByMovie.get(movie.id) ?? null,
      },
      curatedRank: row.curatedRank,
    } satisfies MovieWithRatings;
  });

  return filterAndSortMovies(normalized, filters);
}

export async function getMovieById(movieId: string, viewerUserId?: string | null): Promise<MovieWithRatings | null> {
  const supabase = getSupabaseServiceClient();

  const { data: movie, error: movieError } = await supabase.from("movies").select("*").eq("id", movieId).maybeSingle();
  if (movieError) {
    throw movieError;
  }

  const movieRow = movie as Record<string, unknown> | null;

  if (!movieRow) {
    return null;
  }

  const { data: actorMovie, error: actorMovieError } = await supabase
    .from("actor_movies")
    .select("actor_id, curated_rank")
    .eq("movie_id", movieId)
    .limit(1)
    .maybeSingle();

  if (actorMovieError) {
    throw actorMovieError;
  }

  const actorMovieRow = actorMovie as { actor_id: string; curated_rank: number } | null;
  const actorId = actorMovieRow?.actor_id ? String(actorMovieRow.actor_id) : "";

  const { data: ownerRating, error: ownerError } = await supabase
    .from("owner_ratings")
    .select("score")
    .eq("actor_id", actorId)
    .eq("movie_id", movieId)
    .maybeSingle();

  if (ownerError) {
    throw ownerError;
  }

  const { data: userVotes, error: userVotesError } = await supabase
    .from("user_votes")
    .select("user_id, score")
    .eq("movie_id", movieId);

  if (userVotesError) {
    throw userVotesError;
  }

  let guestVotes: Array<{ score: number }> = [];
  if (includeLegacyGuestVotes()) {
    const { data, error: guestVotesError } = await supabase.from("guest_votes").select("score").eq("movie_id", movieId);
    if (guestVotesError) {
      throw guestVotesError;
    }

    guestVotes = (data ?? []) as Array<{ score: number }>;
  }

  const ownerRatingRow = ownerRating as { score: number } | null;
  const userVoteRows = (userVotes ?? []) as Array<{ user_id: string; score: number }>;
  const scores = userVoteRows.map((item) => Number(item.score));
  for (const vote of guestVotes) {
    scores.push(Number(vote.score));
  }

  const myRating = viewerUserId
    ? userVoteRows.find((vote) => String(vote.user_id) === viewerUserId)?.score ?? null
    : null;

  return {
    ...mapMovieRow(movieRow, actorId),
    ratings: {
      imdbScore: movieRow.imdb_rating ? Number(movieRow.imdb_rating) : null,
      ownerScore: ownerRatingRow?.score ? Number(ownerRatingRow.score) : null,
      communityAvg: computeCommunityAverage(scores),
      communityCount: scores.length,
      myRating,
    },
    curatedRank: Number(actorMovieRow?.curated_rank ?? 999),
  };
}

export async function getMovieByActorAndSlug(
  actorSlug: string,
  movieSlug: string,
  viewerUserId?: string | null,
): Promise<{ actor: Actor; movie: MovieWithRatings } | null> {
  const actor = await getActorBySlug(actorSlug);
  if (!actor) {
    return null;
  }

  const movies = await listActorMovies(actorSlug, {}, viewerUserId);
  const movie = movies.find((item) => item.slug === movieSlug);

  if (!movie) {
    return null;
  }

  return { actor, movie };
}

export async function listMovieComments(
  movieId: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedComments> {
  const supabase = getSupabaseServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("comments")
    .select("id,movie_id,display_name,body,status,created_at,user_id", { count: "exact" })
    .eq("movie_id", movieId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    comments: (data ?? []).map((row) => mapComment(row)),
    page,
    pageSize,
    total: count ?? 0,
  };
}

export async function upsertGuestVote(input: {
  movieId: string;
  guestKeyHash: string;
  ipHash: string;
  score: number;
}) {
  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("guest_votes").upsert(
    {
      movie_id: input.movieId,
      guest_key_hash: input.guestKeyHash,
      ip_hash: input.ipHash,
      score: input.score,
      updated_at: now,
    },
    { onConflict: "movie_id,guest_key_hash" },
  );

  if (error) {
    throw error;
  }
}

export async function upsertUserVote(input: {
  movieId: string;
  userId: string;
  score: number;
}) {
  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("user_votes").upsert(
    {
      movie_id: input.movieId,
      user_id: input.userId,
      score: input.score,
      updated_at: now,
    },
    { onConflict: "movie_id,user_id" },
  );

  if (error) {
    throw error;
  }
}

export async function getAppUserByAuth0Sub(auth0Sub: string): Promise<AppUser | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("app_users").select("*").eq("auth0_sub", auth0Sub).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAppUser(data) : null;
}

export async function upsertAppUser(input: {
  auth0Sub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}): Promise<AppUser> {
  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("app_users")
    .upsert(
      {
        auth0_sub: input.auth0Sub,
        email: input.email,
        name: input.name,
        avatar_url: input.avatarUrl,
        updated_at: now,
      },
      { onConflict: "auth0_sub" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  let mapped = mapAppUser(data);

  if (!mapped.displayName && input.name) {
    const { data: updated, error: updateError } = await supabase
      .from("app_users")
      .update({
        display_name: input.name,
        updated_at: now,
      })
      .eq("id", mapped.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    mapped = mapAppUser(updated);
  }

  return mapped;
}

export async function updateAppUserProfile(input: {
  userId: string;
  displayName: string;
  bio: string | null;
}): Promise<AppUser> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("app_users")
    .update({
      display_name: input.displayName,
      bio: input.bio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapAppUser(data);
}

export async function getUserContributionSummary(userId: string): Promise<{ ratingsCount: number; commentsCount: number }> {
  const supabase = getSupabaseServiceClient();
  const [{ count: ratingsCount, error: ratingsError }, { count: commentsCount, error: commentsError }] = await Promise.all(
    [
      supabase.from("user_votes").select("movie_id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ],
  );

  if (ratingsError) {
    throw ratingsError;
  }

  if (commentsError) {
    throw commentsError;
  }

  return {
    ratingsCount: ratingsCount ?? 0,
    commentsCount: commentsCount ?? 0,
  };
}

export async function listRatingsByUser(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<MyRatingsPage> {
  const supabase = getSupabaseServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: voteRows, count, error } = await supabase
    .from("user_votes")
    .select("movie_id,score,updated_at", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const votes = (voteRows ?? []) as Array<{ movie_id: string; score: number; updated_at: string }>;
  const movieIds = votes.map((vote) => String(vote.movie_id));
  if (!movieIds.length) {
    return {
      items: [],
      page,
      pageSize,
      total: count ?? 0,
    };
  }

  const [{ data: movies, error: moviesError }, { data: actorRows, error: actorRowsError }] = await Promise.all([
    supabase.from("movies").select("id,slug,title,poster_url").in("id", movieIds),
    supabase.from("actor_movies").select("movie_id, actor:actors(slug,name)").in("movie_id", movieIds),
  ]);

  if (moviesError) {
    throw moviesError;
  }

  if (actorRowsError) {
    throw actorRowsError;
  }

  const movieById = new Map<string, Record<string, unknown>>();
  for (const movie of movies ?? []) {
    movieById.set(String(movie.id), movie);
  }

  const actorByMovieId = new Map<string, { slug: string | null; name: string | null }>();
  for (const row of (actorRows ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieId = String(row.movie_id);
    if (actorByMovieId.has(movieId)) {
      continue;
    }

    actorByMovieId.set(movieId, {
      slug: row.actor?.slug ? String(row.actor.slug) : null,
      name: row.actor?.name ? String(row.actor.name) : null,
    });
  }

  const items = votes
    .map((vote) => {
      const movieId = String(vote.movie_id);
      const movie = movieById.get(movieId);
      if (!movie) {
        return null;
      }

      const actor = actorByMovieId.get(movieId) ?? { slug: null, name: null };
      return {
        movieId,
        movieSlug: String(movie.slug),
        movieTitle: String(movie.title),
        actorSlug: actor.slug,
        actorName: actor.name,
        posterUrl: movie.poster_url ? String(movie.poster_url) : null,
        score: Number(vote.score),
        updatedAt: String(vote.updated_at),
      } satisfies MyRatingItem;
    })
    .filter((item): item is MyRatingItem => Boolean(item));

  return {
    items,
    page,
    pageSize,
    total: count ?? 0,
  };
}

export async function createComment(input: {
  commentId?: string;
  movieId: string;
  displayName: string;
  body: string;
  deleteTokenHash: string;
  userId?: string | null;
}) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      id: input.commentId,
      movie_id: input.movieId,
      display_name: input.displayName,
      body: input.body,
      delete_token_hash: input.deleteTokenHash,
      user_id: input.userId ?? null,
      status: "visible",
    })
    .select("id,movie_id,display_name,body,status,created_at,user_id")
    .single();

  if (error) {
    throw error;
  }

  return mapComment(data);
}

export async function getCommentWithDeleteHash(
  commentId: string,
): Promise<{ id: string; status: string; delete_token_hash: string } | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id,status,delete_token_hash")
    .eq("id", commentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    status: String(data.status),
    delete_token_hash: String(data.delete_token_hash),
  };
}

export async function softDeleteComment(commentId: string) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("comments")
    .update({
      status: "deleted",
      body: "[deleted by author]",
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    throw error;
  }
}

export async function reportComment(input: { commentId: string; reason: string; reporterKeyHash: string }) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("comment_reports").insert({
    comment_id: input.commentId,
    reason: input.reason,
    reporter_key_hash: input.reporterKeyHash,
  });

  if (error) {
    throw error;
  }
}

export async function hideComment(commentId: string) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("comments")
    .update({
      status: "hidden",
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    throw error;
  }
}

export async function upsertActor(input: {
  slug: string;
  name: string;
  heroImage: string;
  bio: string;
  isFeatured: boolean;
}) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("actors")
    .upsert(
      {
        slug: input.slug,
        name: input.name,
        hero_image: input.heroImage,
        bio: input.bio,
        is_featured: input.isFeatured,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id,slug")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: String(data.id),
    slug: String(data.slug),
  };
}

export async function upsertMovie(input: {
  slug: string;
  title: string;
  releaseDate: string;
  genres: string[];
  imdbId?: string | null;
  tmdbId?: number;
  posterUrl?: string | null;
  runtimeMinutes?: number | null;
  imdbRating?: number | null;
  synopsis: string;
}) {
  const supabase = getSupabaseServiceClient();
  const year = new Date(input.releaseDate).getUTCFullYear();
  const decade = Math.floor(year / 10) * 10;

  const payload: Record<string, unknown> = {
    slug: input.slug,
    title: input.title,
    release_date: input.releaseDate,
    decade,
    genres: input.genres,
    synopsis: input.synopsis,
    updated_at: new Date().toISOString(),
  };

  if (input.imdbId !== undefined) {
    payload.imdb_id = input.imdbId;
  }

  if (typeof input.tmdbId === "number") {
    payload.tmdb_id = input.tmdbId;
  }

  if (input.posterUrl !== undefined) {
    payload.poster_url = input.posterUrl;
  }

  if (input.runtimeMinutes !== undefined) {
    payload.runtime_minutes = input.runtimeMinutes;
  }

  if (input.imdbRating !== undefined) {
    payload.imdb_rating = input.imdbRating;
  }

  const { data, error } = await supabase
    .from("movies")
    .upsert(payload, { onConflict: typeof input.tmdbId === "number" ? "tmdb_id" : "slug" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return String(data.id);
}

export async function upsertActorMovie(input: { actorId: string; movieId: string; curatedRank: number }) {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.from("actor_movies").upsert(
    {
      actor_id: input.actorId,
      movie_id: input.movieId,
      curated_rank: input.curatedRank,
    },
    { onConflict: "actor_id,movie_id" },
  );

  if (error) {
    throw error;
  }
}

export async function replaceActorMovieCuration(actorId: string, rankedMovieIds: string[]) {
  const supabase = getSupabaseServiceClient();
  const keep = new Set(rankedMovieIds);

  const { data: existing, error: listError } = await supabase
    .from("actor_movies")
    .select("movie_id")
    .eq("actor_id", actorId);

  if (listError) {
    throw listError;
  }

  const existingRows = (existing ?? []) as Array<{ movie_id: string }>;
  const staleMovieIds = existingRows.map((item) => String(item.movie_id)).filter((movieId) => !keep.has(movieId));

  if (!staleMovieIds.length) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("actor_movies")
    .delete()
    .eq("actor_id", actorId)
    .in("movie_id", staleMovieIds);

  if (deleteError) {
    throw deleteError;
  }
}

export async function upsertOwnerRating(input: { actorId: string; movieId: string; score: number }) {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.from("owner_ratings").upsert(
    {
      actor_id: input.actorId,
      movie_id: input.movieId,
      score: input.score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "actor_id,movie_id" },
  );

  if (error) {
    throw error;
  }
}

export async function listActorMoviesForSync(actorSlug: string) {
  const actor = await getActorBySlug(actorSlug);
  if (!actor) {
    throw new Error(`Actor ${actorSlug} not found`);
  }

  const movies = await listActorMovies(actorSlug);
  return { actor, movies };
}

export async function updateMovieExternalData(
  movieId: string,
  input: {
    tmdbId?: number;
    imdbRating?: number | null;
    runtimeMinutes?: number | null;
    posterUrl?: string | null;
    synopsis?: string | null;
    genres?: string[];
  },
) {
  const supabase = getSupabaseServiceClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof input.tmdbId === "number") {
    payload.tmdb_id = input.tmdbId;
  }

  if (typeof input.imdbRating === "number") {
    payload.imdb_rating = input.imdbRating;
  }

  if (input.imdbRating === null) {
    payload.imdb_rating = null;
  }

  if (typeof input.runtimeMinutes === "number") {
    payload.runtime_minutes = input.runtimeMinutes;
  }

  if (input.runtimeMinutes === null) {
    payload.runtime_minutes = null;
  }

  if (input.posterUrl !== undefined) {
    payload.poster_url = input.posterUrl;
  }

  if (input.synopsis !== undefined) {
    payload.synopsis = input.synopsis;
  }

  if (input.genres?.length) {
    payload.genres = input.genres;
  }

  const { error } = await supabase.from("movies").update(payload).eq("id", movieId);

  if (error) {
    throw error;
  }
}

export async function updateActorHeroImage(actorId: string, heroImage: string) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("actors")
    .update({
      hero_image: heroImage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", actorId);

  if (error) {
    throw error;
  }
}

export async function createSyncRun(actorId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      actor_id: actorId,
      status: "running",
      details: {},
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return String(data.id);
}

export async function finishSyncRun(syncRunId: string, status: "success" | "failed", details: unknown) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      details,
      finished_at: new Date().toISOString(),
    })
    .eq("id", syncRunId);

  if (error) {
    throw error;
  }
}
