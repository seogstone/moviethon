import { computeCommunityAverage } from "@/lib/ratings";
import type {
  Actor,
  Comment,
  Movie,
  MovieFilters,
  MovieWithRatings,
  PaginatedComments,
} from "@/lib/types";
import { filterAndSortMovies } from "@/lib/filter-sort";
import { getSupabaseServiceClient } from "@/lib/data/supabase";

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
  return {
    id: String(row.id),
    movieId: String(row.movie_id),
    displayName: String(row.display_name),
    body: String(row.body),
    status: String(row.status) as Comment["status"],
    createdAt: String(row.created_at),
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

export async function listActorMovies(actorSlug: string, filters: MovieFilters = {}): Promise<MovieWithRatings[]> {
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

  const { data: votes, error: voteError } = await supabase
    .from("guest_votes")
    .select("movie_id, score")
    .in("movie_id", movieIds);

  if (voteError) {
    throw voteError;
  }

  const ownerByMovie = new Map<string, number>();
  const ownerRatingRows = (ownerRatings ?? []) as Array<{ movie_id: string; score: number }>;
  for (const row of ownerRatingRows) {
    ownerByMovie.set(String(row.movie_id), Number(row.score));
  }

  const scoreByMovie = new Map<string, number[]>();
  const voteRows = (votes ?? []) as Array<{ movie_id: string; score: number }>;
  for (const vote of voteRows) {
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
      },
      curatedRank: row.curatedRank,
    } satisfies MovieWithRatings;
  });

  return filterAndSortMovies(normalized, filters);
}

export async function getMovieById(movieId: string): Promise<MovieWithRatings | null> {
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

  const { data: votes, error: votesError } = await supabase.from("guest_votes").select("score").eq("movie_id", movieId);
  if (votesError) {
    throw votesError;
  }

  const ownerRatingRow = ownerRating as { score: number } | null;
  const voteRows = (votes ?? []) as Array<{ score: number }>;
  const scores = voteRows.map((item) => Number(item.score));

  return {
    ...mapMovieRow(movieRow, actorId),
    ratings: {
      imdbScore: movieRow.imdb_rating ? Number(movieRow.imdb_rating) : null,
      ownerScore: ownerRatingRow?.score ? Number(ownerRatingRow.score) : null,
      communityAvg: computeCommunityAverage(scores),
      communityCount: scores.length,
    },
    curatedRank: Number(actorMovieRow?.curated_rank ?? 999),
  };
}

export async function getMovieByActorAndSlug(
  actorSlug: string,
  movieSlug: string,
): Promise<{ actor: Actor; movie: MovieWithRatings } | null> {
  const actor = await getActorBySlug(actorSlug);
  if (!actor) {
    return null;
  }

  const movies = await listActorMovies(actorSlug);
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
    .select("id,movie_id,display_name,body,status,created_at", { count: "exact" })
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

export async function createComment(input: {
  commentId?: string;
  movieId: string;
  displayName: string;
  body: string;
  deleteTokenHash: string;
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
      status: "visible",
    })
    .select("id,movie_id,display_name,body,status,created_at")
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
