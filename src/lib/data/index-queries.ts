import { INDEX_V1_KEY } from "@/lib/index/methodology";
import { getSupabaseServiceClient } from "@/lib/data/supabase";
import type {
  ActorIndexHistoryRow,
  ActorAnalyticsPayload,
  CommunityVelocityRow,
  FilmIndexHistoryRow,
  FilmAnalyticsPayload,
  GlobalIndexPoint,
  GenreAnalyticsPayload,
  GenreIndexHistoryRow,
  IndexAnomaly,
  IndexHealth,
  IndexFormulaVersion,
  IndexRun,
  PeerRow,
  MovieDailyMetrics,
  RankingRow,
  SnapshotRow,
  VolatilityClass,
} from "@/lib/types";

interface MovieSignalRow {
  id: string;
  slug: string;
  title: string;
  release_date: string;
  genres: string[];
  imdb_rating: number | null;
}

interface ActorMovieRow {
  actor_id: string;
  movie_id: string;
  movie: {
    id: string;
    title: string;
    release_date: string;
    genres: string[];
  };
  actor: {
    id: string;
    slug: string;
    name: string;
  };
}

interface RoleWeightRow {
  actor_id: string;
  movie_id: string;
  role_weight: number;
}

export interface MovieIndexInputRow {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  releaseDate: string;
  genres: string[];
  imdbRating: number | null;
  tmdbPopularity: number | null;
  tmdbPopularityDelta: number | null;
  ratingsCount7d: number;
  ratingsCount30d: number;
  ratingsCount24h: number;
  commentsCount7d: number;
  commentsCount30d: number;
  commentsCount24h: number;
  watchlistAdds7d: number;
  watchlistAdds30d: number;
  watchlistAdds24h: number;
  ratingVelocityRatio: number | null;
  avgRating7d: number | null;
  avgRating30d: number | null;
  allTimeAvgRating: number | null;
  allTimeRatingCount: number;
  previousIndex7d: number | null;
  previousIndex30d: number | null;
  previous30dSeries: number[];
  previousQualityComponent: number | null;
  previousVelocityComponent: number | null;
  previousEngagementComponent: number | null;
  previousExternalComponent: number | null;
}

export interface ActorIndexInputRow {
  actorId: string;
  actorSlug: string;
  actorName: string;
  films: Array<{
    movieId: string;
    movieTitle: string;
    releaseDate: string;
    filmIndex: number;
    roleWeight: number;
  }>;
  previousIndex7d: number | null;
  previousIndex30d: number | null;
  previous30dSeries: number[];
}

export interface GenreIndexInputRow {
  genre: string;
  movieIndexes: number[];
  previousIndex7d: number | null;
  previousIndex30d: number | null;
  previous30dSeries: number[];
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateDaysAgo(asOfDate: Date, days: number): string {
  const copy = new Date(asOfDate);
  copy.setUTCDate(copy.getUTCDate() - days);
  return toIsoDate(copy);
}

function average(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function toVolatilityClass(value: unknown): VolatilityClass {
  if (value === "stable" || value === "moderate" || value === "high" || value === "insufficient") {
    return value;
  }

  return "insufficient";
}

function extractMetricCounts(metadata: unknown): {
  ratingsCount7d: number;
  ratingsCount30d: number;
  ratingsCount24h: number;
  commentsCount7d: number;
  commentsCount30d: number;
  commentsCount24h: number;
  watchlistAdds24h: number;
  ratingVelocityRatio: number | null;
} {
  const source = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return {
    ratingsCount7d: numberOrNull(source.ratingsCount7d) ?? 0,
    ratingsCount30d: numberOrNull(source.ratingsCount30d) ?? 0,
    ratingsCount24h: numberOrNull(source.ratingsCount24h) ?? 0,
    commentsCount7d: numberOrNull(source.commentsCount7d) ?? 0,
    commentsCount30d: numberOrNull(source.commentsCount30d) ?? 0,
    commentsCount24h: numberOrNull(source.commentsCount24h) ?? 0,
    watchlistAdds24h: numberOrNull(source.watchlistAdds24h) ?? 0,
    ratingVelocityRatio: numberOrNull(source.ratingVelocityRatio),
  };
}

function computeConfidenceScore(counts: {
  ratingsCount7d: number;
  ratingsCount30d: number;
  commentsCount7d: number;
}): number {
  const ratingDepth = Math.min(1, counts.ratingsCount30d / 20);
  const recentActivity = Math.min(1, counts.ratingsCount7d / 8);
  const discussionDepth = Math.min(1, counts.commentsCount7d / 5);
  const score = ratingDepth * 55 + recentActivity * 35 + discussionDepth * 10;
  return Math.round(score * 10) / 10;
}

function buildSeriesMap(
  rows: Array<{ entityId: string; asOfDate: string; indexValue: number }>,
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const dateMap = map.get(row.entityId) ?? new Map<string, number>();
    dateMap.set(row.asOfDate, row.indexValue);
    map.set(row.entityId, dateMap);
  }

  return map;
}

function previousSeries(dateMap: Map<string, number> | undefined, asOfDate: Date): number[] {
  if (!dateMap) {
    return [];
  }

  const values: number[] = [];
  for (let day = 30; day >= 1; day -= 1) {
    const value = dateMap.get(dateDaysAgo(asOfDate, day));
    if (typeof value === "number") {
      values.push(value);
    }
  }

  return values;
}

function previousPoint(dateMap: Map<string, number> | undefined, asOfDate: Date, days: number): number | null {
  if (!dateMap) {
    return null;
  }

  const value = dateMap.get(dateDaysAgo(asOfDate, days));
  return typeof value === "number" ? value : null;
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

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      throw error;
    }

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function mapFormula(row: Record<string, unknown>): IndexFormulaVersion {
  return {
    id: String(row.id),
    versionKey: String(row.version_key),
    weights: (row.weights_json ?? {}) as Record<string, number>,
    normalization: (row.normalization_json ?? {}) as Record<string, number | string | number[]>,
    changelog: row.changelog ? String(row.changelog) : null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getActiveIndexFormulaVersion(): Promise<IndexFormulaVersion> {
  const supabase = getSupabaseServiceClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("index_formula_versions")
    .upsert(
      {
        version_key: INDEX_V1_KEY,
        weights_json: { quality: 0.55, velocity: 0.18, engagement: 0.12, recency: 0, external: 0.15 },
        normalization_json: {
          scoreRange: [0, 100],
          bayesianPriorStrength: 50,
          confidenceScale: 40,
          recencyHalfLifeDays: 365,
        },
        changelog:
          "Aligned with index_formula.md: Bayesian quality, log2 momentum ratios, recency-adjusted momentum, and confidence damping.",
        is_active: true,
        updated_at: nowIso,
      },
      { onConflict: "version_key" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: deactivateError } = await supabase
    .from("index_formula_versions")
    .update({
      is_active: false,
      updated_at: nowIso,
    })
    .neq("version_key", INDEX_V1_KEY)
    .eq("is_active", true);

  if (deactivateError) {
    throw deactivateError;
  }

  return mapFormula(data);
}

export async function startIndexRun(asOfDate: Date, formulaVersionId: string): Promise<IndexRun> {
  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("index_runs")
    .upsert(
      {
        as_of_date: toIsoDate(asOfDate),
        formula_version_id: formulaVersionId,
        status: "running",
        summary_json: null,
        error_json: null,
        started_at: now,
        finished_at: null,
        updated_at: now,
      },
      { onConflict: "as_of_date,formula_version_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const row = data as Record<string, unknown>;

  return {
    id: String(row.id),
    asOfDate: String(row.as_of_date),
    formulaVersionId: String(row.formula_version_id),
    status: String(row.status),
    summary: (row.summary_json ?? null) as Record<string, unknown> | null,
    error: (row.error_json ?? null) as Record<string, unknown> | null,
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function finishIndexRun(
  runId: string,
  status: "success" | "failed" | "partial",
  summary: Record<string, unknown> | null,
  errorPayload: Record<string, unknown> | null,
): Promise<void> {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("index_runs")
    .update({
      status,
      summary_json: summary,
      error_json: errorPayload,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    throw error;
  }
}

export async function collectMovieIndexInputs(
  asOfDate: Date,
  formulaVersionId: string,
): Promise<{ rows: MovieIndexInputRow[]; globalMeanRating: number }> {
  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);
  const start30d = dateDaysAgo(asOfDate, 30);

  const [movieRows, voteRows, commentRows, watchlistRows] = await Promise.all([
    fetchAllPages<MovieSignalRow>(async (from, to) =>
      supabase
        .from("movies")
        .select("id,slug,title,release_date,genres,imdb_rating")
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ movie_id: string; score: number; updated_at: string }>(async (from, to) =>
      supabase
        .from("user_votes")
        .select("movie_id,score,updated_at")
        .order("movie_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ movie_id: string; created_at: string; status: string }>(async (from, to) =>
      supabase
        .from("comments")
        .select("movie_id,created_at,status")
        .gte("created_at", `${start30d}T00:00:00Z`)
        .order("created_at", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ movie_id: string; created_at: string }>(async (from, to) =>
      supabase
        .from("user_watchlist")
        .select("movie_id,created_at")
        .gte("created_at", `${start30d}T00:00:00Z`)
        .order("created_at", { ascending: true })
        .range(from, to),
    ),
  ]);

  const historyRows = await fetchAllPages<{
    movie_id: string;
    as_of_date: string;
    index_value: number;
    quality_component: number;
    velocity_component: number;
    engagement_component: number;
    external_component: number;
  }>(async (from, to) =>
    supabase
      .from("film_index_history")
      .select(
        "movie_id,as_of_date,index_value,quality_component,velocity_component,engagement_component,external_component",
      )
      .eq("formula_version_id", formulaVersionId)
      .gte("as_of_date", dateDaysAgo(asOfDate, 31))
      .lt("as_of_date", asOf)
      .order("as_of_date", { ascending: true })
      .range(from, to),
  );

  const typedHistoryRows = historyRows as Array<{
    movie_id: string;
    as_of_date: string;
    index_value: number;
    quality_component: number;
    velocity_component: number;
    engagement_component: number;
    external_component: number;
  }>;

  const historySeries = buildSeriesMap(
    typedHistoryRows.map((row) => ({
      entityId: String(row.movie_id),
      asOfDate: String(row.as_of_date),
      indexValue: Number(row.index_value),
    })),
  );

  const componentHistoryByMovie = new Map<
    string,
    Map<string, { quality: number; velocity: number; engagement: number; external: number }>
  >();
  for (const row of typedHistoryRows) {
    const movieId = String(row.movie_id);
    const asOf = String(row.as_of_date);
    const dateMap = componentHistoryByMovie.get(movieId) ?? new Map();
    dateMap.set(asOf, {
      quality: Number(row.quality_component),
      velocity: Number(row.velocity_component),
      engagement: Number(row.engagement_component),
      external: Number(row.external_component),
    });
    componentHistoryByMovie.set(movieId, dateMap);
  }

  const votesByMovie = new Map<string, Array<{ score: number; updatedAt: string }>>();
  for (const vote of voteRows) {
    const movieId = String(vote.movie_id);
    const bucket = votesByMovie.get(movieId) ?? [];
    bucket.push({ score: Number(vote.score), updatedAt: String(vote.updated_at) });
    votesByMovie.set(movieId, bucket);
  }

  const commentsByMovie = new Map<string, Array<{ createdAt: string; status: string }>>();
  for (const comment of commentRows) {
    const movieId = String(comment.movie_id);
    const bucket = commentsByMovie.get(movieId) ?? [];
    bucket.push({ createdAt: String(comment.created_at), status: String(comment.status) });
    commentsByMovie.set(movieId, bucket);
  }

  const watchlistByMovie = new Map<string, string[]>();
  for (const row of watchlistRows) {
    const movieId = String(row.movie_id);
    const bucket = watchlistByMovie.get(movieId) ?? [];
    bucket.push(String(row.created_at));
    watchlistByMovie.set(movieId, bucket);
  }

  const cutoff7d = new Date(`${dateDaysAgo(asOfDate, 7)}T00:00:00Z`).getTime();
  const cutoff24h = new Date(`${dateDaysAgo(asOfDate, 1)}T00:00:00Z`).getTime();
  const cutoff30d = new Date(`${start30d}T00:00:00Z`).getTime();
  const asOfEnd = new Date(`${asOf}T23:59:59.999Z`).getTime();

  const globalAllScores = voteRows.map((vote) => Number(vote.score));
  const globalMeanRating = average(globalAllScores) ?? 7;

  const rows: MovieIndexInputRow[] = movieRows.map((movie) => {
    const movieId = String(movie.id);
    const voteRows = votesByMovie.get(movieId) ?? [];
    const commentRows = commentsByMovie.get(movieId) ?? [];
    const watchlistRows = watchlistByMovie.get(movieId) ?? [];

    const allTimeScores = voteRows.map((vote) => vote.score);
    const votes7d = voteRows.filter((vote) => {
      const timestamp = new Date(vote.updatedAt).getTime();
      return timestamp >= cutoff7d && timestamp <= asOfEnd;
    });
    const votes30d = voteRows.filter((vote) => {
      const timestamp = new Date(vote.updatedAt).getTime();
      return timestamp >= cutoff30d && timestamp <= asOfEnd;
    });
    const votes24h = voteRows.filter((vote) => {
      const timestamp = new Date(vote.updatedAt).getTime();
      return timestamp >= cutoff24h && timestamp <= asOfEnd;
    });

    const comments7d = commentRows.filter((comment) => {
      const timestamp = new Date(comment.createdAt).getTime();
      return comment.status === "visible" && timestamp >= cutoff7d && timestamp <= asOfEnd;
    });
    const comments30d = commentRows.filter((comment) => {
      const timestamp = new Date(comment.createdAt).getTime();
      return comment.status === "visible" && timestamp >= cutoff30d && timestamp <= asOfEnd;
    });
    const comments24h = commentRows.filter((comment) => {
      const timestamp = new Date(comment.createdAt).getTime();
      return comment.status === "visible" && timestamp >= cutoff24h && timestamp <= asOfEnd;
    });

    const watchlist7d = watchlistRows.filter((value) => {
      const timestamp = new Date(value).getTime();
      return timestamp >= cutoff7d && timestamp <= asOfEnd;
    });
    const watchlist30d = watchlistRows.filter((value) => {
      const timestamp = new Date(value).getTime();
      return timestamp >= cutoff30d && timestamp <= asOfEnd;
    });
    const watchlist24h = watchlistRows.filter((value) => {
      const timestamp = new Date(value).getTime();
      return timestamp >= cutoff24h && timestamp <= asOfEnd;
    });

    const dateMap = historySeries.get(movieId);
    const componentDateMap = componentHistoryByMovie.get(movieId);
    const previousDayComponents = componentDateMap?.get(dateDaysAgo(asOfDate, 1));

    return {
      movieId,
      movieSlug: String(movie.slug),
      movieTitle: String(movie.title),
      releaseDate: String(movie.release_date),
      genres: Array.isArray(movie.genres) ? movie.genres : [],
      imdbRating: numberOrNull(movie.imdb_rating),
      tmdbPopularity: null,
      tmdbPopularityDelta: null,
      ratingsCount7d: votes7d.length,
      ratingsCount30d: votes30d.length,
      ratingsCount24h: votes24h.length,
      commentsCount7d: comments7d.length,
      commentsCount30d: comments30d.length,
      commentsCount24h: comments24h.length,
      watchlistAdds7d: watchlist7d.length,
      watchlistAdds30d: watchlist30d.length,
      watchlistAdds24h: watchlist24h.length,
      ratingVelocityRatio:
        votes30d.length === 0 ? null : Number((Math.max(0, votes7d.length / 7) / Math.max(1 / 30, votes30d.length / 30)).toFixed(4)),
      avgRating7d: average(votes7d.map((vote) => vote.score)),
      avgRating30d: average(votes30d.map((vote) => vote.score)),
      allTimeAvgRating: average(allTimeScores),
      allTimeRatingCount: allTimeScores.length,
      previousIndex7d: previousPoint(dateMap, asOfDate, 7),
      previousIndex30d: previousPoint(dateMap, asOfDate, 30),
      previous30dSeries: previousSeries(dateMap, asOfDate),
      previousQualityComponent: previousDayComponents?.quality ?? null,
      previousVelocityComponent: previousDayComponents?.velocity ?? null,
      previousEngagementComponent: previousDayComponents?.engagement ?? null,
      previousExternalComponent: previousDayComponents?.external ?? null,
    };
  });

  return { rows, globalMeanRating };
}

export async function upsertMovieDailyMetrics(asOfDate: Date, rows: MovieDailyMetrics[]): Promise<void> {
  if (!rows.length) {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);

  const payload = rows.map((row) => ({
    movie_id: row.movieId,
    as_of_date: asOf,
    ratings_count_7d: row.ratingsCount7d,
    ratings_count_30d: row.ratingsCount30d,
    ratings_count_24h: row.ratingsCount24h,
    comments_count_7d: row.commentsCount7d,
    comments_count_30d: row.commentsCount30d,
    comments_count_24h: row.commentsCount24h,
    watchlist_adds_24h: row.watchlistAdds24h,
    rating_velocity_ratio: row.ratingVelocityRatio,
    avg_rating_7d: row.avgRating7d,
    avg_rating_30d: row.avgRating30d,
    tmdb_popularity: row.tmdbPopularity,
    tmdb_popularity_delta: row.tmdbPopularityDelta,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("movie_daily_metrics").upsert(payload, { onConflict: "movie_id,as_of_date" });
  if (error) {
    throw error;
  }
}

export async function upsertFilmIndexHistory(
  asOfDate: Date,
  formulaVersionId: string,
  rows: FilmIndexHistoryRow[],
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);
  const payload = rows.map((row) => ({
    movie_id: row.movieId,
    as_of_date: asOf,
    formula_version_id: formulaVersionId,
    index_value: row.indexValue,
    delta_1d: row.delta1d,
    rank_position: row.rankPosition,
    rank_change_1d: row.rankChange1d,
    quality_component: row.qualityComponent,
    velocity_component: row.velocityComponent,
    engagement_component: row.engagementComponent,
    recency_component: row.recencyComponent,
    external_component: row.externalComponent,
    delta_7d: row.delta7d,
    delta_30d: row.delta30d,
    volatility_30d: row.volatility30d,
    volatility_class: row.volatilityClass,
    metadata_json: row.metadata,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("film_index_history")
    .upsert(payload, { onConflict: "movie_id,as_of_date,formula_version_id" });

  if (error) {
    throw error;
  }
}

export async function collectActorIndexInputs(
  asOfDate: Date,
  formulaVersionId: string,
): Promise<ActorIndexInputRow[]> {
  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);
  const [actorMovieRows, roleRows, filmRows, actorHistory] = await Promise.all([
    fetchAllPages<ActorMovieRow>(async (from, to) =>
      supabase
        .from("actor_movies")
        .select("actor_id,movie_id,movie:movies(id,title,release_date,genres),actor:actors(id,slug,name)")
        .order("actor_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<RoleWeightRow>(async (from, to) =>
      supabase
        .from("actor_movie_role_weights")
        .select("actor_id,movie_id,role_weight")
        .order("actor_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ movie_id: string; index_value: number }>(async (from, to) =>
      supabase
        .from("film_index_history")
        .select("movie_id,index_value")
        .eq("as_of_date", asOf)
        .eq("formula_version_id", formulaVersionId)
        .order("movie_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ actor_id: string; as_of_date: string; index_value: number }>(async (from, to) =>
      supabase
        .from("actor_index_history")
        .select("actor_id,as_of_date,index_value")
        .eq("formula_version_id", formulaVersionId)
        .gte("as_of_date", dateDaysAgo(asOfDate, 31))
        .lt("as_of_date", asOf)
        .order("as_of_date", { ascending: true })
        .range(from, to),
    ),
  ]);

  const roleByPair = new Map<string, number>();
  for (const row of roleRows) {
    roleByPair.set(`${row.actor_id}:${row.movie_id}`, Number(row.role_weight));
  }

  const filmIndexByMovie = new Map<string, number>();
  for (const row of filmRows) {
    filmIndexByMovie.set(String(row.movie_id), Number(row.index_value));
  }

  const actorSeries = buildSeriesMap(
    actorHistory.map((row) => ({
      entityId: String(row.actor_id),
      asOfDate: String(row.as_of_date),
      indexValue: Number(row.index_value),
    })),
  );

  const byActor = new Map<string, ActorIndexInputRow>();
  for (const row of actorMovieRows as unknown as ActorMovieRow[]) {
    const actorId = String(row.actor.id);
    const movieId = String(row.movie.id);
    const filmIndex = filmIndexByMovie.get(movieId);
    if (typeof filmIndex !== "number") {
      continue;
    }

    const current =
      byActor.get(actorId) ??
      {
        actorId,
        actorSlug: String(row.actor.slug),
        actorName: String(row.actor.name),
        films: [],
        previousIndex7d: previousPoint(actorSeries.get(actorId), asOfDate, 7),
        previousIndex30d: previousPoint(actorSeries.get(actorId), asOfDate, 30),
        previous30dSeries: previousSeries(actorSeries.get(actorId), asOfDate),
      };

    current.films.push({
      movieId,
      movieTitle: String(row.movie.title),
      releaseDate: String(row.movie.release_date),
      filmIndex,
      roleWeight: roleByPair.get(`${actorId}:${movieId}`) ?? 1,
    });

    byActor.set(actorId, current);
  }

  return Array.from(byActor.values());
}

export async function upsertActorIndexHistory(
  asOfDate: Date,
  formulaVersionId: string,
  rows: ActorIndexHistoryRow[],
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);
  const payload = rows.map((row) => ({
    actor_id: row.actorId,
    as_of_date: asOf,
    formula_version_id: formulaVersionId,
    index_value: row.indexValue,
    delta_1d: row.delta1d,
    rank_position: row.rankPosition,
    rank_change_1d: row.rankChange1d,
    delta_7d: row.delta7d,
    delta_30d: row.delta30d,
    volatility_30d: row.volatility30d,
    volatility_class: row.volatilityClass,
    contribution_json: row.contribution,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("actor_index_history")
    .upsert(payload, { onConflict: "actor_id,as_of_date,formula_version_id" });

  if (error) {
    throw error;
  }
}

export async function collectGenreIndexInputs(
  asOfDate: Date,
  formulaVersionId: string,
): Promise<GenreIndexInputRow[]> {
  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);
  const [movies, filmRows, genreHistory] = await Promise.all([
    fetchAllPages<{ id: string; genres: string[] }>(async (from, to) =>
      supabase.from("movies").select("id,genres").order("id", { ascending: true }).range(from, to),
    ),
    fetchAllPages<{ movie_id: string; index_value: number }>(async (from, to) =>
      supabase
        .from("film_index_history")
        .select("movie_id,index_value")
        .eq("as_of_date", asOf)
        .eq("formula_version_id", formulaVersionId)
        .order("movie_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ genre: string; as_of_date: string; index_value: number }>(async (from, to) =>
      supabase
        .from("genre_index_history")
        .select("genre,as_of_date,index_value")
        .eq("formula_version_id", formulaVersionId)
        .gte("as_of_date", dateDaysAgo(asOfDate, 31))
        .lt("as_of_date", asOf)
        .order("as_of_date", { ascending: true })
        .range(from, to),
    ),
  ]);

  const filmIndexByMovie = new Map<string, number>();
  for (const row of filmRows) {
    filmIndexByMovie.set(String(row.movie_id), Number(row.index_value));
  }

  const historyMap = buildSeriesMap(
    genreHistory.map((row) => ({
      entityId: String(row.genre),
      asOfDate: String(row.as_of_date),
      indexValue: Number(row.index_value),
    })),
  );

  const genreMovieIndexes = new Map<string, number[]>();

  for (const movie of movies) {
    const movieId = String(movie.id);
    const filmIndex = filmIndexByMovie.get(movieId);
    if (typeof filmIndex !== "number") {
      continue;
    }

    const genres = Array.isArray(movie.genres) ? movie.genres : [];
    for (const genre of genres) {
      const key = String(genre);
      const bucket = genreMovieIndexes.get(key) ?? [];
      bucket.push(filmIndex);
      genreMovieIndexes.set(key, bucket);
    }
  }

  return Array.from(genreMovieIndexes.entries()).map(([genre, indexes]) => {
    const dateMap = historyMap.get(genre);
    return {
      genre,
      movieIndexes: indexes,
      previousIndex7d: previousPoint(dateMap, asOfDate, 7),
      previousIndex30d: previousPoint(dateMap, asOfDate, 30),
      previous30dSeries: previousSeries(dateMap, asOfDate),
    };
  });
}

export async function upsertGenreIndexHistory(
  asOfDate: Date,
  formulaVersionId: string,
  rows: GenreIndexHistoryRow[],
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);
  const payload = rows.map((row) => ({
    genre: row.genre,
    as_of_date: asOf,
    formula_version_id: formulaVersionId,
    index_value: row.indexValue,
    delta_1d: row.delta1d,
    rank_position: row.rankPosition,
    rank_change_1d: row.rankChange1d,
    delta_7d: row.delta7d,
    delta_30d: row.delta30d,
    volatility_30d: row.volatility30d,
    volatility_class: row.volatilityClass,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("genre_index_history")
    .upsert(payload, { onConflict: "genre,as_of_date,formula_version_id" });

  if (error) {
    throw error;
  }
}

export async function upsertGlobalIndexHistory(
  asOfDate: Date,
  formulaVersionId: string,
  row: GlobalIndexPoint,
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const asOf = toIsoDate(asOfDate);

  const { error } = await supabase.from("global_index_history").upsert(
    {
      as_of_date: asOf,
      formula_version_id: formulaVersionId,
      index_value: row.indexValue,
      delta_1d: row.delta1d,
      delta_7d: row.delta7d,
      delta_30d: row.delta30d,
      volatility_30d: row.volatility30d,
      volatility_class: row.volatilityClass,
      metadata_json: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "as_of_date,formula_version_id" },
  );

  if (error) {
    throw error;
  }
}

export async function getGlobalIndexHistory(days = 30): Promise<GlobalIndexPoint[]> {
  const supabase = getSupabaseServiceClient();
  const safeDays = Math.min(3650, Math.max(1, days));
  const query = supabase
    .from("global_index_history")
    .select("as_of_date,index_value,delta_1d,delta_7d,delta_30d,volatility_30d,volatility_class,formula:index_formula_versions(version_key)")
    .order("as_of_date", { ascending: false });

  const { data, error } = days === Number.POSITIVE_INFINITY ? await query : await query.limit(safeDays);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    asOfDate: String(row.as_of_date),
    indexValue: numberOrNull(row.index_value) ?? 0,
    delta1d: numberOrNull(row.delta_1d),
    delta7d: numberOrNull(row.delta_7d),
    delta30d: numberOrNull(row.delta_30d),
    volatility30d: numberOrNull(row.volatility_30d),
    volatilityClass: toVolatilityClass(row.volatility_class),
    formulaVersion:
      row.formula && typeof row.formula === "object" && "version_key" in row.formula
        ? String((row.formula as { version_key: string }).version_key)
        : null,
  }));
}

export async function getLatestFilmRankings(input: {
  limit?: number;
  offset?: number;
  sortBy?: "index" | "delta_7d" | "volatility";
  sortDir?: "asc" | "desc";
} = {}): Promise<{ rows: RankingRow[]; asOfDate: string | null }> {
  const supabase = getSupabaseServiceClient();
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  const sortByColumn =
    input.sortBy === "delta_7d" ? "delta_7d" : input.sortBy === "volatility" ? "volatility_30d" : "index_value";
  const ascending = input.sortDir === "asc";

  const { data: latestRow, error: latestError } = await supabase
    .from("film_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  const asOfDate = latestRow?.as_of_date ? String(latestRow.as_of_date) : null;
  if (!asOfDate) {
    return { rows: [], asOfDate: null };
  }

  const { data: rows, error } = await supabase
    .from("film_index_history")
    .select("movie_id,index_value,delta_1d,delta_7d,delta_30d,rank_position,rank_change_1d,volatility_class,metadata_json")
    .eq("as_of_date", asOfDate)
    .order(sortByColumn, { ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const movieIds = (rows ?? []).map((row) => String(row.movie_id));

  const [{ data: movies, error: moviesError }, { data: actorRows, error: actorRowsError }] = await Promise.all([
    supabase.from("movies").select("id,slug,title").in("id", movieIds),
    supabase.from("actor_movies").select("movie_id,actor:actors(slug,name)").in("movie_id", movieIds),
  ]);

  if (moviesError) {
    throw moviesError;
  }

  if (actorRowsError) {
    throw actorRowsError;
  }

  const movieById = new Map<string, { slug: string; title: string }>();
  for (const row of (movies ?? []) as Array<{ id: string; slug: string; title: string }>) {
    movieById.set(String(row.id), { slug: String(row.slug), title: String(row.title) });
  }

  const actorByMovieId = new Map<string, { actorSlug: string | null; actorName: string | null }>();
  for (const row of (actorRows ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieId = String(row.movie_id);
    if (!actorByMovieId.has(movieId)) {
      actorByMovieId.set(movieId, {
        actorSlug: row.actor?.slug ? String(row.actor.slug) : null,
        actorName: row.actor?.name ? String(row.actor.name) : null,
      });
    }
  }

  const mappedRows = ((rows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const movieId = String(row.movie_id);
      const movie = movieById.get(movieId);
      if (!movie) {
        return null;
      }

      const actor = actorByMovieId.get(movieId) ?? { actorSlug: null, actorName: null };
      const counts = extractMetricCounts(row.metadata_json);
      return {
        id: movieId,
        label: movie.title,
        slug: movie.slug,
        entityType: "film",
        actorSlug: actor.actorSlug,
        actorName: actor.actorName,
        indexValue: numberOrNull(row.index_value) ?? 0,
        delta1d: numberOrNull(row.delta_1d),
        delta7d: numberOrNull(row.delta_7d),
        delta30d: numberOrNull(row.delta_30d),
        rankPosition: numberOrNull(row.rank_position),
        rankChange1d: numberOrNull(row.rank_change_1d),
        volatilityClass: toVolatilityClass(row.volatility_class),
        asOfDate,
        confidenceScore: computeConfidenceScore({
          ratingsCount7d: counts.ratingsCount7d,
          ratingsCount30d: counts.ratingsCount30d,
          commentsCount7d: counts.commentsCount7d,
        }),
      } satisfies RankingRow;
    });

  const rankingRows = mappedRows.filter(
    (row): row is NonNullable<(typeof mappedRows)[number]> => row !== null,
  );

  return { rows: rankingRows, asOfDate };
}

export async function getLatestActorRankings(input: {
  limit?: number;
  offset?: number;
  sortBy?: "index" | "delta_7d" | "volatility";
  sortDir?: "asc" | "desc";
} = {}): Promise<{ rows: RankingRow[]; asOfDate: string | null }> {
  const supabase = getSupabaseServiceClient();
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  const sortByColumn =
    input.sortBy === "delta_7d" ? "delta_7d" : input.sortBy === "volatility" ? "volatility_30d" : "index_value";
  const ascending = input.sortDir === "asc";

  const { data: latestRow, error: latestError } = await supabase
    .from("actor_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  const asOfDate = latestRow?.as_of_date ? String(latestRow.as_of_date) : null;
  if (!asOfDate) {
    return { rows: [], asOfDate: null };
  }

  const { data: rows, error } = await supabase
    .from("actor_index_history")
    .select("actor_id,index_value,delta_1d,delta_7d,delta_30d,rank_position,rank_change_1d,volatility_class")
    .eq("as_of_date", asOfDate)
    .order(sortByColumn, { ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const actorIds = (rows ?? []).map((row) => String(row.actor_id));
  const { data: actors, error: actorsError } = await supabase.from("actors").select("id,slug,name").in("id", actorIds);
  if (actorsError) {
    throw actorsError;
  }

  const actorById = new Map<string, { slug: string; name: string }>();
  for (const row of (actors ?? []) as Array<{ id: string; slug: string; name: string }>) {
    actorById.set(String(row.id), { slug: String(row.slug), name: String(row.name) });
  }

  const mappedRows = ((rows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const actorId = String(row.actor_id);
      const actor = actorById.get(actorId);
      if (!actor) {
        return null;
      }

      return {
        id: actorId,
        label: actor.name,
        slug: actor.slug,
        entityType: "actor",
        actorSlug: actor.slug,
        actorName: actor.name,
        indexValue: numberOrNull(row.index_value) ?? 0,
        delta1d: numberOrNull(row.delta_1d),
        delta7d: numberOrNull(row.delta_7d),
        delta30d: numberOrNull(row.delta_30d),
        rankPosition: numberOrNull(row.rank_position),
        rankChange1d: numberOrNull(row.rank_change_1d),
        volatilityClass: toVolatilityClass(row.volatility_class),
        asOfDate,
        confidenceScore: null,
      } satisfies RankingRow;
    });

  const rankingRows = mappedRows.filter(
    (row): row is NonNullable<(typeof mappedRows)[number]> => row !== null,
  );

  return { rows: rankingRows, asOfDate };
}

export async function getLatestGenreRankings(input: {
  limit?: number;
  offset?: number;
  sortBy?: "index" | "delta_7d" | "volatility";
  sortDir?: "asc" | "desc";
} = {}): Promise<{ rows: RankingRow[]; asOfDate: string | null }> {
  const supabase = getSupabaseServiceClient();
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  const sortByColumn =
    input.sortBy === "delta_7d" ? "delta_7d" : input.sortBy === "volatility" ? "volatility_30d" : "index_value";
  const ascending = input.sortDir === "asc";

  const { data: latestRow, error: latestError } = await supabase
    .from("genre_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  const asOfDate = latestRow?.as_of_date ? String(latestRow.as_of_date) : null;
  if (!asOfDate) {
    return { rows: [], asOfDate: null };
  }

  const { data: rows, error } = await supabase
    .from("genre_index_history")
    .select("genre,index_value,delta_1d,delta_7d,delta_30d,rank_position,rank_change_1d,volatility_class")
    .eq("as_of_date", asOfDate)
    .order(sortByColumn, { ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const rankingRows: RankingRow[] = ((rows ?? []) as Array<Record<string, unknown>>).map(
    (row) =>
      ({
        id: String(row.genre),
        label: String(row.genre),
        slug: String(row.genre).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        entityType: "genre",
        actorSlug: null,
        actorName: null,
        indexValue: numberOrNull(row.index_value) ?? 0,
        delta1d: numberOrNull(row.delta_1d),
        delta7d: numberOrNull(row.delta_7d),
        delta30d: numberOrNull(row.delta_30d),
        rankPosition: numberOrNull(row.rank_position),
        rankChange1d: numberOrNull(row.rank_change_1d),
        volatilityClass: toVolatilityClass(row.volatility_class),
        asOfDate,
        confidenceScore: null,
      }) satisfies RankingRow,
  );

  return { rows: rankingRows, asOfDate };
}

export async function getLatestMoverRankings(input: {
  type: "gainers" | "decliners";
  window?: "24h" | "7d";
  limit?: number;
  offset?: number;
}): Promise<{ rows: RankingRow[]; asOfDate: string | null }> {
  const window = input.window ?? "7d";
  const base = await getLatestFilmRankings({
    limit: 200,
    offset: 0,
    sortBy: window === "24h" ? "index" : "delta_7d",
    sortDir: "desc",
  });
  if (!base.rows.length) {
    return { rows: [], asOfDate: base.asOfDate };
  }

  let rows = [...base.rows];
  const supabase = getSupabaseServiceClient();
  if (base.asOfDate) {
    const movieIds = rows.map((row) => row.id);
    const { data: confidenceRows, error } = await supabase
      .from("film_index_history")
      .select("movie_id,metadata_json")
      .eq("as_of_date", base.asOfDate)
      .in("movie_id", movieIds);

    if (!error) {
      const confidenceByMovie = new Map<string, { ratingsCount30d: number; ratingsCount7d: number; commentsCount7d: number; confidenceScore: number }>();
      for (const row of (confidenceRows ?? []) as Array<{ movie_id: string; metadata_json: Record<string, unknown> }>) {
        const counts = extractMetricCounts(row.metadata_json);
        const confidenceScore = computeConfidenceScore({
          ratingsCount7d: counts.ratingsCount7d,
          ratingsCount30d: counts.ratingsCount30d,
          commentsCount7d: counts.commentsCount7d,
        });
        confidenceByMovie.set(String(row.movie_id), {
          ratingsCount30d: counts.ratingsCount30d,
          ratingsCount7d: counts.ratingsCount7d,
          commentsCount7d: counts.commentsCount7d,
          confidenceScore,
        });
      }

      rows = rows
        .map((row) => {
          const confidence = confidenceByMovie.get(row.id);
          return {
            ...row,
            confidenceScore: confidence?.confidenceScore ?? null,
          };
        })
        .filter((row) => {
        const confidence = confidenceByMovie.get(row.id);
        if (!confidence) {
          return false;
        }

          return confidence.ratingsCount30d >= 5 && confidence.ratingsCount7d >= 2 && confidence.confidenceScore >= 35;
        });
    }
  }

  const metricKey: "delta1d" | "delta7d" = window === "24h" ? "delta1d" : "delta7d";
  rows = rows.filter((row) => typeof row[metricKey] === "number");

  rows.sort((a, b) => {
    const left = (a[metricKey] ?? 0) as number;
    const right = (b[metricKey] ?? 0) as number;
    return input.type === "gainers" ? right - left : left - right;
  });

  const offset = Math.max(0, input.offset ?? 0);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  return {
    asOfDate: base.asOfDate,
    rows: rows.slice(offset, offset + limit),
  };
}

export async function getIndexHealth(): Promise<IndexHealth> {
  const supabase = getSupabaseServiceClient();
  const { data: latestRun, error } = await supabase
    .from("index_runs")
    .select("id,as_of_date,status,summary_json,error_json,finished_at,started_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!latestRun) {
    return {
      ok: false,
      stale: true,
      latestAsOfDate: null,
      latestRunStatus: null,
      latestRunFinishedAt: null,
      runSummary: null,
      runError: null,
      secondsSinceLastRun: null,
    };
  }

  const finishedAt = latestRun.finished_at ? String(latestRun.finished_at) : String(latestRun.started_at);
  const secondsSinceLastRun = Math.floor((Date.now() - new Date(finishedAt).getTime()) / 1000);
  const stale = secondsSinceLastRun > 60 * 60 * 36;
  const ok = String(latestRun.status) === "success" && !stale;

  return {
    ok,
    stale,
    latestAsOfDate: latestRun.as_of_date ? String(latestRun.as_of_date) : null,
    latestRunStatus: latestRun.status ? String(latestRun.status) : null,
    latestRunFinishedAt: latestRun.finished_at ? String(latestRun.finished_at) : null,
    runSummary: (latestRun.summary_json ?? null) as Record<string, unknown> | null,
    runError: (latestRun.error_json ?? null) as Record<string, unknown> | null,
    secondsSinceLastRun,
  };
}

export async function getIndexAnomalies(limit = 30): Promise<{ asOfDate: string | null; items: IndexAnomaly[] }> {
  const supabase = getSupabaseServiceClient();
  const { data: latestRow, error: latestError } = await supabase
    .from("film_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  const asOfDate = latestRow?.as_of_date ? String(latestRow.as_of_date) : null;
  if (!asOfDate) {
    return { asOfDate: null, items: [] };
  }

  const { data: rows, error } = await supabase
    .from("film_index_history")
    .select("movie_id,index_value,delta_7d,volatility_class,metadata_json")
    .eq("as_of_date", asOfDate)
    .order("delta_7d", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  const movieIds = Array.from(new Set((rows ?? []).map((row) => String(row.movie_id))));
  const movieChunks = chunkArray(movieIds, 250);
  const [movieResponses, actorResponses] = await Promise.all([
    Promise.all(movieChunks.map((chunk) => supabase.from("movies").select("id,title").in("id", chunk))),
    Promise.all(
      movieChunks.map((chunk) =>
        supabase.from("actor_movies").select("movie_id,actor:actors(slug,name)").in("movie_id", chunk),
      ),
    ),
  ]);

  for (const response of movieResponses) {
    if (response.error) {
      throw response.error;
    }
  }

  for (const response of actorResponses) {
    if (response.error) {
      throw response.error;
    }
  }

  const movies = movieResponses.flatMap((response) => (response.data ?? []) as Array<{ id: string; title: string }>);
  const actorRows = actorResponses.flatMap(
    (response) => (response.data ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>,
  );

  const movieById = new Map<string, string>();
  for (const row of (movies ?? []) as Array<{ id: string; title: string }>) {
    movieById.set(String(row.id), String(row.title));
  }

  const actorByMovieId = new Map<string, { actorSlug: string | null; actorName: string | null }>();
  for (const row of (actorRows ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieId = String(row.movie_id);
    if (!actorByMovieId.has(movieId)) {
      actorByMovieId.set(movieId, {
        actorSlug: row.actor?.slug ? String(row.actor.slug) : null,
        actorName: row.actor?.name ? String(row.actor.name) : null,
      });
    }
  }

  const items = ((rows ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const movieId = String(row.movie_id);
      const movieTitle = movieById.get(movieId);
      if (!movieTitle) {
        return null;
      }

      const counts = extractMetricCounts(row.metadata_json);
      const confidenceScore = computeConfidenceScore({
        ratingsCount7d: counts.ratingsCount7d,
        ratingsCount30d: counts.ratingsCount30d,
        commentsCount7d: counts.commentsCount7d,
      });

      const reasons: string[] = [];
      const delta7d = numberOrNull(row.delta_7d);
      if (delta7d !== null && Math.abs(delta7d) >= 12) {
        reasons.push("large 7d index swing");
      }
      if (counts.ratingsCount30d < 5) {
        reasons.push("low 30d rating depth");
      }
      if (counts.ratingsCount7d >= 8 && counts.commentsCount7d === 0) {
        reasons.push("rating burst without discussion");
      }
      if (confidenceScore < 35) {
        reasons.push("low confidence signal");
      }

      if (!reasons.length) {
        return null;
      }

      const actor = actorByMovieId.get(movieId) ?? { actorSlug: null, actorName: null };
      return {
        movieId,
        movieTitle,
        actorSlug: actor.actorSlug,
        actorName: actor.actorName,
        indexValue: numberOrNull(row.index_value) ?? 0,
        delta7d,
        volatilityClass: toVolatilityClass(row.volatility_class),
        ratingsCount7d: counts.ratingsCount7d,
        ratingsCount30d: counts.ratingsCount30d,
        commentsCount7d: counts.commentsCount7d,
        confidenceScore,
        reasons,
      } satisfies IndexAnomaly;
    })
    .filter((item): item is IndexAnomaly => Boolean(item))
    .sort((left, right) => {
      const deltaGap = Math.abs(right.delta7d ?? 0) - Math.abs(left.delta7d ?? 0);
      if (deltaGap !== 0) {
        return deltaGap;
      }
      return left.confidenceScore - right.confidenceScore;
    })
    .slice(0, limit);

  return { asOfDate, items };
}

export async function getMovieIndexHistory(movieId: string, days = 30): Promise<FilmIndexHistoryRow[]> {
  const supabase = getSupabaseServiceClient();
  const safeDays = Math.min(120, Math.max(1, days));

  const { data, error } = await supabase
    .from("film_index_history")
    .select("movie_id,as_of_date,index_value,delta_1d,rank_position,rank_change_1d,quality_component,velocity_component,engagement_component,recency_component,external_component,delta_7d,delta_30d,volatility_30d,volatility_class,metadata_json,formula:index_formula_versions(version_key)")
    .eq("movie_id", movieId)
    .order("as_of_date", { ascending: false })
    .limit(safeDays);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    movieId: String(row.movie_id),
    asOfDate: String(row.as_of_date),
    indexValue: numberOrNull(row.index_value) ?? 0,
    delta1d: numberOrNull(row.delta_1d),
    rankPosition: numberOrNull(row.rank_position),
    rankChange1d: numberOrNull(row.rank_change_1d),
    qualityComponent: numberOrNull(row.quality_component) ?? 0,
    velocityComponent: numberOrNull(row.velocity_component) ?? 0,
    engagementComponent: numberOrNull(row.engagement_component) ?? 0,
    recencyComponent: numberOrNull(row.recency_component) ?? 0,
    externalComponent: numberOrNull(row.external_component) ?? 0,
    delta7d: numberOrNull(row.delta_7d),
    delta30d: numberOrNull(row.delta_30d),
    volatility30d: numberOrNull(row.volatility_30d),
    volatilityClass: toVolatilityClass(row.volatility_class),
    metadata: (row.metadata_json ?? {}) as Record<string, unknown>,
    formulaVersion: row.formula && typeof row.formula === "object" && "version_key" in row.formula
      ? String((row.formula as { version_key: string }).version_key)
      : null,
  }));
}

export async function getActorIndexHistory(actorId: string, days = 30): Promise<ActorIndexHistoryRow[]> {
  const supabase = getSupabaseServiceClient();
  const safeDays = Math.min(120, Math.max(1, days));

  const { data, error } = await supabase
    .from("actor_index_history")
    .select("actor_id,as_of_date,index_value,delta_1d,rank_position,rank_change_1d,delta_7d,delta_30d,volatility_30d,volatility_class,contribution_json,formula:index_formula_versions(version_key)")
    .eq("actor_id", actorId)
    .order("as_of_date", { ascending: false })
    .limit(safeDays);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    actorId: String(row.actor_id),
    asOfDate: String(row.as_of_date),
    indexValue: numberOrNull(row.index_value) ?? 0,
    delta1d: numberOrNull(row.delta_1d),
    rankPosition: numberOrNull(row.rank_position),
    rankChange1d: numberOrNull(row.rank_change_1d),
    delta7d: numberOrNull(row.delta_7d),
    delta30d: numberOrNull(row.delta_30d),
    volatility30d: numberOrNull(row.volatility_30d),
    volatilityClass: toVolatilityClass(row.volatility_class),
    contribution: Array.isArray(row.contribution_json)
      ? (row.contribution_json as Array<Record<string, unknown>>)
      : [],
    formulaVersion: row.formula && typeof row.formula === "object" && "version_key" in row.formula
      ? String((row.formula as { version_key: string }).version_key)
      : null,
  }));
}

export async function getGenreIndexHistory(genre: string, days = 30): Promise<GenreIndexHistoryRow[]> {
  const supabase = getSupabaseServiceClient();
  const safeDays = Math.min(120, Math.max(1, days));

  const { data, error } = await supabase
    .from("genre_index_history")
    .select("genre,as_of_date,index_value,delta_1d,rank_position,rank_change_1d,delta_7d,delta_30d,volatility_30d,volatility_class,formula:index_formula_versions(version_key)")
    .eq("genre", genre)
    .order("as_of_date", { ascending: false })
    .limit(safeDays);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    genre: String(row.genre),
    asOfDate: String(row.as_of_date),
    indexValue: numberOrNull(row.index_value) ?? 0,
    delta1d: numberOrNull(row.delta_1d),
    rankPosition: numberOrNull(row.rank_position),
    rankChange1d: numberOrNull(row.rank_change_1d),
    delta7d: numberOrNull(row.delta_7d),
    delta30d: numberOrNull(row.delta_30d),
    volatility30d: numberOrNull(row.volatility_30d),
    volatilityClass: toVolatilityClass(row.volatility_class),
    formulaVersion:
      row.formula && typeof row.formula === "object" && "version_key" in row.formula
        ? String((row.formula as { version_key: string }).version_key)
        : null,
  }));
}

export async function getLatestMovieIndexSnapshot(movieId: string): Promise<FilmIndexHistoryRow | null> {
  const [latest] = await getMovieIndexHistory(movieId, 1);
  return latest ?? null;
}

export async function getLatestActorIndexSnapshot(actorId: string): Promise<ActorIndexHistoryRow | null> {
  const [latest] = await getActorIndexHistory(actorId, 1);
  return latest ?? null;
}

export async function getLatestGenreIndexSnapshot(genre: string): Promise<GenreIndexHistoryRow | null> {
  const [latest] = await getGenreIndexHistory(genre, 1);
  return latest ?? null;
}

export async function getHomepageIndexOverview(limit = 8): Promise<{
  topGainers: RankingRow[];
  topDecliners: RankingRow[];
  mostVolatile: RankingRow[];
  trendingFilms: RankingRow[];
  genrePerformance: RankingRow[];
  asOfDate: string | null;
}> {
  const [gainers, decliners, films, genres] = await Promise.all([
    getLatestMoverRankings({ type: "gainers", window: "7d", limit }),
    getLatestMoverRankings({ type: "decliners", window: "7d", limit }),
    getLatestFilmRankings({ limit, sortBy: "index", sortDir: "desc" }),
    getLatestGenreRankings({ limit, sortBy: "index", sortDir: "desc" }),
  ]);

  const volatile = await getLatestFilmRankings({ limit: Math.max(20, limit * 3), sortBy: "volatility", sortDir: "desc" });

  return {
    topGainers: gainers.rows.slice(0, limit),
    topDecliners: decliners.rows.slice(0, limit),
    mostVolatile: volatile.rows.slice(0, limit),
    trendingFilms: films.rows.slice(0, limit),
    genrePerformance: genres.rows.slice(0, limit),
    asOfDate: films.asOfDate ?? gainers.asOfDate ?? genres.asOfDate,
  };
}

function toGenreSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function resolveGenreBySlug(genreSlug: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const rows = await fetchAllPages<{ genres: string[] }>(async (from, to) =>
    supabase.from("movies").select("genres").order("id", { ascending: true }).range(from, to),
  );

  const normalized = genreSlug.trim().toLowerCase();
  const allGenres = new Set<string>();
  for (const row of rows) {
    for (const genre of Array.isArray(row.genres) ? row.genres : []) {
      allGenres.add(String(genre));
    }
  }

  for (const genre of allGenres) {
    if (toGenreSlug(genre) === normalized) {
      return genre;
    }
  }

  return null;
}

export async function getHomepageFilmTable(input: {
  tab: "all" | "gainers" | "decliners" | "volatile" | "trending";
  limit?: number;
}): Promise<{ rows: RankingRow[]; asOfDate: string | null }> {
  const limit = input.limit ?? 25;

  if (input.tab === "gainers") {
    return getLatestMoverRankings({ type: "gainers", window: "7d", limit });
  }

  if (input.tab === "decliners") {
    return getLatestMoverRankings({ type: "decliners", window: "7d", limit });
  }

  if (input.tab === "volatile") {
    return getLatestFilmRankings({ limit, sortBy: "volatility", sortDir: "desc" });
  }

  if (input.tab === "trending") {
    const payload = await getLatestFilmRankings({ limit: Math.max(limit * 3, 75), sortBy: "delta_7d", sortDir: "desc" });
    return { asOfDate: payload.asOfDate, rows: payload.rows.filter((row) => (row.delta7d ?? 0) > 0).slice(0, limit) };
  }

  return getLatestFilmRankings({ limit, sortBy: "index", sortDir: "desc" });
}

export async function getCommunityVelocityRows(limit = 25): Promise<CommunityVelocityRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data: latestRow, error: latestError } = await supabase
    .from("movie_daily_metrics")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  const asOfDate = latestRow?.as_of_date ? String(latestRow.as_of_date) : null;
  if (!asOfDate) {
    return [];
  }

  const { data: metricRows, error: metricError } = await supabase
    .from("movie_daily_metrics")
    .select("movie_id,ratings_count_24h,comments_count_24h,rating_velocity_ratio")
    .eq("as_of_date", asOfDate)
    .order("ratings_count_24h", { ascending: false })
    .limit(Math.max(limit * 2, 50));

  if (metricError) {
    throw metricError;
  }

  const movieIds = Array.from(new Set((metricRows ?? []).map((row) => String(row.movie_id))));
  if (!movieIds.length) {
    return [];
  }

  const [{ data: movies, error: moviesError }, { data: actorRows, error: actorError }] = await Promise.all([
    supabase.from("movies").select("id,slug,title").in("id", movieIds),
    supabase.from("actor_movies").select("movie_id,actor:actors(slug,name)").in("movie_id", movieIds),
  ]);

  if (moviesError) {
    throw moviesError;
  }

  if (actorError) {
    throw actorError;
  }

  const movieById = new Map<string, { slug: string; title: string }>();
  for (const row of (movies ?? []) as Array<{ id: string; slug: string; title: string }>) {
    movieById.set(String(row.id), { slug: String(row.slug), title: String(row.title) });
  }

  const actorByMovieId = new Map<string, { actorSlug: string | null; actorName: string | null }>();
  for (const row of (actorRows ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieId = String(row.movie_id);
    if (actorByMovieId.has(movieId)) {
      continue;
    }

    actorByMovieId.set(movieId, {
      actorSlug: row.actor?.slug ? String(row.actor.slug) : null,
      actorName: row.actor?.name ? String(row.actor.name) : null,
    });
  }

  return ((metricRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const movieId = String(row.movie_id);
      const movie = movieById.get(movieId);
      if (!movie) {
        return null;
      }

      const actor = actorByMovieId.get(movieId) ?? { actorSlug: null, actorName: null };
      return {
        movieId,
        movieSlug: movie.slug,
        movieTitle: movie.title,
        actorSlug: actor.actorSlug,
        actorName: actor.actorName,
        newRatings24h: numberOrNull(row.ratings_count_24h) ?? 0,
        ratingVelocityRatio: numberOrNull(row.rating_velocity_ratio),
        comments24h: numberOrNull(row.comments_count_24h) ?? 0,
      } satisfies CommunityVelocityRow;
    })
    .filter((row): row is CommunityVelocityRow => row !== null)
    .sort((left, right) => {
      if (right.newRatings24h !== left.newRatings24h) {
        return right.newRatings24h - left.newRatings24h;
      }
      return (right.comments24h ?? 0) - (left.comments24h ?? 0);
    })
    .slice(0, limit);
}

export async function getFilmInstrumentPanel(movieId: string): Promise<{
  movieId: string;
  actorSlug: string | null;
  actorName: string | null;
  indexCurrent: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  delta1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  volatilityClass: VolatilityClass;
} | null> {
  const supabase = getSupabaseServiceClient();
  const [latest] = await getMovieIndexHistory(movieId, 1);
  if (!latest) {
    return null;
  }

  const { data: actorRow, error } = await supabase
    .from("actor_movies")
    .select("actor_id,actor:actors(slug,name)")
    .eq("movie_id", movieId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const actor = ((actorRow as Record<string, unknown> | null)?.actor ?? null) as
    | { slug?: string; name?: string }
    | null;

  return {
    movieId,
    actorSlug: actor?.slug ? String(actor.slug) : null,
    actorName: actor?.name ? String(actor.name) : null,
    indexCurrent: latest.indexValue,
    rankPosition: latest.rankPosition,
    rankChange1d: latest.rankChange1d,
    delta1d: latest.delta1d,
    delta7d: latest.delta7d,
    delta30d: latest.delta30d,
    volatilityClass: latest.volatilityClass,
  };
}

export async function getFilmPerformanceSnapshots(
  movieId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: SnapshotRow[]; page: number; pageSize: number; total: number }> {
  const supabase = getSupabaseServiceClient();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(60, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, count, error } = await supabase
    .from("film_index_history")
    .select("as_of_date,index_value,rank_position,delta_1d,quality_component,velocity_component,external_component", {
      count: "exact",
    })
    .eq("movie_id", movieId)
    .order("as_of_date", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
    items: ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) =>
        ({
          asOfDate: String(row.as_of_date),
          indexValue: numberOrNull(row.index_value) ?? 0,
          rankPosition: numberOrNull(row.rank_position),
          delta1d: numberOrNull(row.delta_1d),
          ratingScore: numberOrNull(row.quality_component),
          velocityScore: numberOrNull(row.velocity_component),
          externalScore: numberOrNull(row.external_component),
        }) satisfies SnapshotRow,
    ),
  };
}

export async function getComparableFilms(movieId: string, limit = 10): Promise<PeerRow[]> {
  const supabase = getSupabaseServiceClient();
  const latest = await getLatestMovieIndexSnapshot(movieId);
  if (!latest) {
    return [];
  }

  const { data: latestRow, error: latestError } = await supabase
    .from("film_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  const asOfDate = latestRow?.as_of_date ? String(latestRow.as_of_date) : null;
  if (!asOfDate) {
    return [];
  }

  const { data, error } = await supabase
    .from("film_index_history")
    .select("movie_id,index_value,delta_7d,volatility_class,rank_position")
    .eq("as_of_date", asOfDate);

  if (error) {
    throw error;
  }

  const candidates = ((data ?? []) as Array<Record<string, unknown>>).filter(
    (row) => String(row.movie_id) !== movieId,
  );

  const ranked = candidates
    .map((row) => {
      const indexValue = numberOrNull(row.index_value) ?? 0;
      const delta7d = numberOrNull(row.delta_7d);
      const volatilityClass = toVolatilityClass(row.volatility_class);
      const rankPosition = numberOrNull(row.rank_position);
      const indexGap = Math.abs(indexValue - latest.indexValue);
      const deltaGap = Math.abs((delta7d ?? 0) - (latest.delta7d ?? 0));
      const volatilityPenalty = volatilityClass === latest.volatilityClass ? 0 : 8;
      const similarityScore = Math.max(0, 100 - indexGap * 1.2 - deltaGap * 0.8 - volatilityPenalty);
      return {
        movieId: String(row.movie_id),
        indexValue,
        delta7d,
        volatilityClass,
        rankPosition,
        similarityScore: round2(similarityScore),
      };
    })
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, Math.max(1, limit));

  const movieIds = ranked.map((row) => row.movieId);
  const [{ data: movies, error: moviesError }, { data: actorRows, error: actorError }] = await Promise.all([
    supabase.from("movies").select("id,slug,title").in("id", movieIds),
    supabase.from("actor_movies").select("movie_id,actor:actors(slug,name)").in("movie_id", movieIds),
  ]);

  if (moviesError) {
    throw moviesError;
  }

  if (actorError) {
    throw actorError;
  }

  const movieById = new Map<string, { slug: string; title: string }>();
  for (const row of (movies ?? []) as Array<{ id: string; slug: string; title: string }>) {
    movieById.set(String(row.id), { slug: String(row.slug), title: String(row.title) });
  }

  const actorByMovie = new Map<string, { actorSlug: string | null; actorName: string | null }>();
  for (const row of (actorRows ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieIdRow = String(row.movie_id);
    if (!actorByMovie.has(movieIdRow)) {
      actorByMovie.set(movieIdRow, {
        actorSlug: row.actor?.slug ? String(row.actor.slug) : null,
        actorName: row.actor?.name ? String(row.actor.name) : null,
      });
    }
  }

  const output: PeerRow[] = [];
  for (const row of ranked) {
    const movie = movieById.get(row.movieId);
    if (!movie) {
      continue;
    }

    const actor = actorByMovie.get(row.movieId) ?? { actorSlug: null, actorName: null };
    output.push({
      id: row.movieId,
      slug: movie.slug,
      label: movie.title,
      entityType: "film",
      actorSlug: actor.actorSlug,
      actorName: actor.actorName,
      indexValue: row.indexValue,
      delta7d: row.delta7d,
      volatilityClass: row.volatilityClass,
      rankPosition: row.rankPosition,
      similarityScore: row.similarityScore,
    });
  }

  return output;
}

export async function getAlsoMovingFilms(movieId: string, limit = 10): Promise<PeerRow[]> {
  const latest = await getLatestMovieIndexSnapshot(movieId);
  if (!latest || latest.delta7d === null) {
    return [];
  }

  const peers = await getLatestFilmRankings({ limit: 200, sortBy: "delta_7d", sortDir: latest.delta7d >= 0 ? "desc" : "asc" });
  const targetSign = Math.sign(latest.delta7d);

  return peers.rows
    .filter((row) => row.id !== movieId && row.delta7d !== null && Math.sign(row.delta7d) === targetSign)
    .sort((left, right) => Math.abs((left.delta7d ?? 0) - latest.delta7d!) - Math.abs((right.delta7d ?? 0) - latest.delta7d!))
    .slice(0, Math.max(1, limit))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      label: row.label,
      entityType: "film",
      actorSlug: row.actorSlug,
      actorName: row.actorName,
      indexValue: row.indexValue,
      delta7d: row.delta7d,
      volatilityClass: row.volatilityClass,
      rankPosition: row.rankPosition,
      similarityScore: round2(100 - Math.abs((row.delta7d ?? 0) - latest.delta7d!)),
    }));
}

export async function getFilmCommunityVelocity(movieId: string): Promise<FilmAnalyticsPayload["communityVelocity"]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("movie_daily_metrics")
    .select("as_of_date,ratings_count_24h,comments_count_24h,rating_velocity_ratio")
    .eq("movie_id", movieId)
    .order("as_of_date", { ascending: true })
    .limit(60);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const latest = rows.at(-1);

  return {
    ratings24h: latest ? numberOrNull(latest.ratings_count_24h) ?? 0 : 0,
    comments24h: latest ? numberOrNull(latest.comments_count_24h) ?? 0 : 0,
    velocityRatio: latest ? numberOrNull(latest.rating_velocity_ratio) : null,
    trend: rows.slice(-14).map((row) => numberOrNull(row.rating_velocity_ratio) ?? 0),
  };
}

export async function getActorInstrumentPanel(actorId: string): Promise<ActorAnalyticsPayload | null> {
  const supabase = getSupabaseServiceClient();
  const [latest] = await getActorIndexHistory(actorId, 1);
  if (!latest) {
    return null;
  }

  const { data: actorRow, error: actorError } = await supabase
    .from("actors")
    .select("id,slug,name")
    .eq("id", actorId)
    .maybeSingle();

  if (actorError) {
    throw actorError;
  }

  if (!actorRow) {
    return null;
  }

  const history = await getActorIndexHistory(actorId, 90);
  const snapshots = history.slice(0, 30).map(
    (row) =>
      ({
        asOfDate: row.asOfDate,
        indexValue: row.indexValue,
        rankPosition: row.rankPosition,
        delta1d: row.delta1d,
        ratingScore: null,
        velocityScore: null,
        externalScore: null,
      }) satisfies SnapshotRow,
  );

  return {
    actorId: String(actorRow.id),
    actorSlug: String(actorRow.slug),
    actorName: String(actorRow.name),
    indexCurrent: latest.indexValue,
    rankPosition: latest.rankPosition,
    rankChange1d: latest.rankChange1d,
    delta1d: latest.delta1d,
    delta7d: latest.delta7d,
    delta30d: latest.delta30d,
    volatilityClass: latest.volatilityClass,
    trend: history.slice().reverse().map((row) => ({ date: row.asOfDate, value: row.indexValue })),
    snapshots,
    peers: await getComparableActors(actorId, 8),
    alsoMoving: await getActorsAlsoMoving(actorId, 8),
    topGenres: await getActorGenreExposure(actorId),
    contributions: await getActorContributionTable(actorId, 25),
  };
}

export async function getActorContributionTable(actorId: string, limit = 25): Promise<ActorAnalyticsPayload["contributions"]> {
  const supabase = getSupabaseServiceClient();
  const [latest] = await getActorIndexHistory(actorId, 1);
  if (!latest?.contribution?.length) {
    return [];
  }

  const contributions = latest.contribution
    .map((row) => ({
      movieId: String(row.movieId ?? ""),
      title: String(row.movieTitle ?? "movie"),
      roleWeight: numberOrNull(row.roleWeight) ?? 1,
      filmIndex: numberOrNull(row.filmIndex) ?? 0,
      contributionPercent: numberOrNull(row.contribution) ?? 0,
    }))
    .filter((row) => row.movieId);

  const movieIds = contributions.map((row) => row.movieId);
  const { data: movies, error: moviesError } = await supabase.from("movies").select("id,slug").in("id", movieIds);
  if (moviesError) {
    throw moviesError;
  }

  const slugByMovie = new Map<string, string>();
  for (const row of (movies ?? []) as Array<{ id: string; slug: string }>) {
    slugByMovie.set(String(row.id), String(row.slug));
  }

  const { data: latestFilmRows, error: filmRowsError } = await supabase
    .from("film_index_history")
    .select("movie_id,delta_7d")
    .in("movie_id", movieIds)
    .order("as_of_date", { ascending: false });

  if (filmRowsError) {
    throw filmRowsError;
  }

  const deltaByMovie = new Map<string, number | null>();
  for (const row of (latestFilmRows ?? []) as Array<{ movie_id: string; delta_7d: number | null }>) {
    const movieId = String(row.movie_id);
    if (!deltaByMovie.has(movieId)) {
      deltaByMovie.set(movieId, row.delta_7d === null ? null : Number(row.delta_7d));
    }
  }

  return contributions
    .map((row) => ({
      movieId: row.movieId,
      movieSlug: slugByMovie.get(row.movieId) ?? row.movieId,
      title: row.title,
      roleWeight: row.roleWeight,
      filmIndex: row.filmIndex,
      contributionPercent: row.contributionPercent,
      filmDelta7d: deltaByMovie.get(row.movieId) ?? null,
    }))
    .sort((left, right) => right.contributionPercent - left.contributionPercent)
    .slice(0, Math.max(1, limit));
}

export async function getActorSnapshotHistory(
  actorId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: SnapshotRow[]; page: number; pageSize: number; total: number }> {
  const supabase = getSupabaseServiceClient();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(60, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, count, error } = await supabase
    .from("actor_index_history")
    .select("as_of_date,index_value,rank_position,delta_1d", { count: "exact" })
    .eq("actor_id", actorId)
    .order("as_of_date", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
    items: ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      asOfDate: String(row.as_of_date),
      indexValue: numberOrNull(row.index_value) ?? 0,
      rankPosition: numberOrNull(row.rank_position),
      delta1d: numberOrNull(row.delta_1d),
      ratingScore: null,
      velocityScore: null,
      externalScore: null,
    })),
  };
}

export async function getComparableActors(actorId: string, limit = 10): Promise<PeerRow[]> {
  const latest = await getLatestActorIndexSnapshot(actorId);
  if (!latest) {
    return [];
  }

  const peers = await getLatestActorRankings({ limit: 200, sortBy: "index", sortDir: "desc" });
  return peers.rows
    .filter((row) => row.id !== actorId)
    .map((row) => {
      const indexGap = Math.abs(row.indexValue - latest.indexValue);
      const deltaGap = Math.abs((row.delta7d ?? 0) - (latest.delta7d ?? 0));
      const volatilityPenalty = row.volatilityClass === latest.volatilityClass ? 0 : 8;
      return {
        id: row.id,
        slug: row.slug,
        label: row.label,
        entityType: "actor",
        actorSlug: row.actorSlug,
        actorName: row.actorName,
        indexValue: row.indexValue,
        delta7d: row.delta7d,
        volatilityClass: row.volatilityClass,
        rankPosition: row.rankPosition,
        similarityScore: round2(Math.max(0, 100 - indexGap * 1.25 - deltaGap * 0.75 - volatilityPenalty)),
      } satisfies PeerRow;
    })
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, Math.max(1, limit));
}

export async function getActorsAlsoMoving(actorId: string, limit = 10): Promise<PeerRow[]> {
  const latest = await getLatestActorIndexSnapshot(actorId);
  if (!latest || latest.delta7d === null) {
    return [];
  }

  const peers = await getLatestActorRankings({
    limit: 200,
    sortBy: "delta_7d",
    sortDir: latest.delta7d >= 0 ? "desc" : "asc",
  });

  const targetSign = Math.sign(latest.delta7d);

  return peers.rows
    .filter((row) => row.id !== actorId && row.delta7d !== null && Math.sign(row.delta7d) === targetSign)
    .sort((left, right) => Math.abs((left.delta7d ?? 0) - latest.delta7d!) - Math.abs((right.delta7d ?? 0) - latest.delta7d!))
    .slice(0, Math.max(1, limit))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      label: row.label,
      entityType: "actor",
      actorSlug: row.actorSlug,
      actorName: row.actorName,
      indexValue: row.indexValue,
      delta7d: row.delta7d,
      volatilityClass: row.volatilityClass,
      rankPosition: row.rankPosition,
      similarityScore: round2(100 - Math.abs((row.delta7d ?? 0) - latest.delta7d!)),
    }));
}

export async function getActorGenreExposure(actorId: string): Promise<ActorAnalyticsPayload["topGenres"]> {
  const supabase = getSupabaseServiceClient();
  const { data: latestDateRow, error: latestDateError } = await supabase
    .from("film_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestDateError) {
    throw latestDateError;
  }

  const asOfDate = latestDateRow?.as_of_date ? String(latestDateRow.as_of_date) : null;
  if (!asOfDate) {
    return [];
  }

  const { data: actorMovies, error: actorMoviesError } = await supabase
    .from("actor_movies")
    .select("movie_id")
    .eq("actor_id", actorId);

  if (actorMoviesError) {
    throw actorMoviesError;
  }

  const movieIds = (actorMovies ?? []).map((row) => String(row.movie_id));
  if (!movieIds.length) {
    return [];
  }

  const [{ data: movies, error: moviesError }, { data: indexRows, error: indexRowsError }, { data: roleRows, error: roleRowsError }] =
    await Promise.all([
      supabase.from("movies").select("id,genres").in("id", movieIds),
      supabase.from("film_index_history").select("movie_id,index_value").eq("as_of_date", asOfDate).in("movie_id", movieIds),
      supabase.from("actor_movie_role_weights").select("movie_id,role_weight").eq("actor_id", actorId).in("movie_id", movieIds),
    ]);

  if (moviesError) {
    throw moviesError;
  }

  if (indexRowsError) {
    throw indexRowsError;
  }

  if (roleRowsError) {
    throw roleRowsError;
  }

  const indexByMovie = new Map<string, number>();
  for (const row of (indexRows ?? []) as Array<{ movie_id: string; index_value: number }>) {
    indexByMovie.set(String(row.movie_id), Number(row.index_value));
  }

  const weightByMovie = new Map<string, number>();
  for (const row of (roleRows ?? []) as Array<{ movie_id: string; role_weight: number }>) {
    weightByMovie.set(String(row.movie_id), Number(row.role_weight));
  }

  const aggregates = new Map<string, { contribution: number; weightedIndex: number; count: number }>();
  let totalContribution = 0;

  for (const row of (movies ?? []) as Array<{ id: string; genres: string[] }>) {
    const movieId = String(row.id);
    const indexValue = indexByMovie.get(movieId);
    if (typeof indexValue !== "number") {
      continue;
    }

    const roleWeight = weightByMovie.get(movieId) ?? 1;
    const contribution = Math.max(0, indexValue * roleWeight);
    totalContribution += contribution;
    const genres = Array.isArray(row.genres) ? row.genres : [];

    for (const genre of genres) {
      const key = String(genre);
      const current = aggregates.get(key) ?? { contribution: 0, weightedIndex: 0, count: 0 };
      current.contribution += contribution;
      current.weightedIndex += indexValue;
      current.count += 1;
      aggregates.set(key, current);
    }
  }

  return Array.from(aggregates.entries())
    .map(([genre, metric]) => ({
      genre,
      contributionPercent: totalContribution <= 0 ? 0 : round2((metric.contribution / totalContribution) * 100),
      averageFilmIndex: metric.count ? round2(metric.weightedIndex / metric.count) : 0,
    }))
    .sort((left, right) => right.contributionPercent - left.contributionPercent)
    .slice(0, 6);
}

export async function getGenreInstrumentPanel(genreSlug: string): Promise<GenreAnalyticsPayload | null> {
  const genre = await resolveGenreBySlug(genreSlug);
  if (!genre) {
    return null;
  }

  const latest = await getLatestGenreIndexSnapshot(genre);
  if (!latest) {
    return null;
  }

  const history = await getGenreIndexHistory(genre, 120);
  const [topFilms, relatedGenres, insights, volatilityDistribution, actorExposure] = await Promise.all([
    getGenreTopFilms(genreSlug, 25),
    getRelatedGenres(genreSlug, 8),
    getGenreInsights(genreSlug),
    getGenreVolatilityDistribution(genreSlug),
    getGenreActorExposure(genreSlug, 12),
  ]);

  return {
    genre,
    indexCurrent: latest.indexValue,
    rankPosition: latest.rankPosition,
    rankChange1d: latest.rankChange1d,
    delta1d: latest.delta1d,
    delta7d: latest.delta7d,
    delta30d: latest.delta30d,
    volatilityClass: latest.volatilityClass,
    trend: history.slice().reverse().map((point) => ({ date: point.asOfDate, value: point.indexValue })),
    topFilms,
    relatedGenres,
    insights,
    volatilityDistribution,
    actorExposure,
  };
}

export async function getGenreHistory(genreSlug: string, days = 30): Promise<GenreIndexHistoryRow[]> {
  const genre = await resolveGenreBySlug(genreSlug);
  if (!genre) {
    return [];
  }

  const normalizedDays = Math.min(3650, Math.max(1, days));
  return getGenreIndexHistory(genre, normalizedDays);
}

export async function getGenreTopFilms(genreSlug: string, limit = 25): Promise<PeerRow[]> {
  const genre = await resolveGenreBySlug(genreSlug);
  if (!genre) {
    return [];
  }

  const supabase = getSupabaseServiceClient();
  const { data: latestDateRow, error: latestDateError } = await supabase
    .from("film_index_history")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestDateError) {
    throw latestDateError;
  }

  const asOfDate = latestDateRow?.as_of_date ? String(latestDateRow.as_of_date) : null;
  if (!asOfDate) {
    return [];
  }

  const { data: movies, error: moviesError } = await supabase.from("movies").select("id,slug,title,genres").contains("genres", [genre]);
  if (moviesError) {
    throw moviesError;
  }

  const movieIds = (movies ?? []).map((row) => String(row.id));
  if (!movieIds.length) {
    return [];
  }

  const [{ data: indexRows, error: indexError }, { data: actorRows, error: actorError }] = await Promise.all([
    supabase
      .from("film_index_history")
      .select("movie_id,index_value,delta_7d,volatility_class,rank_position")
      .eq("as_of_date", asOfDate)
      .in("movie_id", movieIds),
    supabase.from("actor_movies").select("movie_id,actor:actors(slug,name)").in("movie_id", movieIds),
  ]);

  if (indexError) {
    throw indexError;
  }

  if (actorError) {
    throw actorError;
  }

  const movieById = new Map<string, { slug: string; title: string }>();
  for (const row of (movies ?? []) as Array<{ id: string; slug: string; title: string }>) {
    movieById.set(String(row.id), { slug: String(row.slug), title: String(row.title) });
  }

  const actorByMovie = new Map<string, { actorSlug: string | null; actorName: string | null }>();
  for (const row of (actorRows ?? []) as Array<{ movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieId = String(row.movie_id);
    if (!actorByMovie.has(movieId)) {
      actorByMovie.set(movieId, {
        actorSlug: row.actor?.slug ? String(row.actor.slug) : null,
        actorName: row.actor?.name ? String(row.actor.name) : null,
      });
    }
  }

  const rows: PeerRow[] = [];
  for (const row of (indexRows ?? []) as Array<Record<string, unknown>>) {
    const movieId = String(row.movie_id);
    const movie = movieById.get(movieId);
    if (!movie) {
      continue;
    }
    const actor = actorByMovie.get(movieId) ?? { actorSlug: null, actorName: null };
    rows.push({
      id: movieId,
      slug: movie.slug,
      label: movie.title,
      entityType: "film",
      actorSlug: actor.actorSlug,
      actorName: actor.actorName,
      indexValue: numberOrNull(row.index_value) ?? 0,
      delta7d: numberOrNull(row.delta_7d),
      volatilityClass: toVolatilityClass(row.volatility_class),
      rankPosition: numberOrNull(row.rank_position),
      similarityScore: 0,
    });
  }

  return rows.sort((left, right) => right.indexValue - left.indexValue).slice(0, Math.max(1, limit));
}

export async function getGenreInsights(genreSlug: string): Promise<string[]> {
  const topFilms = await getGenreTopFilms(genreSlug, 25);
  if (!topFilms.length) {
    return ["not enough signal yet for this genre."];
  }

  const positive = topFilms.filter((film) => (film.delta7d ?? 0) > 0).length;
  const avgDelta7d = round2(topFilms.reduce((sum, film) => sum + (film.delta7d ?? 0), 0) / topFilms.length);
  const avgIndex = round2(topFilms.reduce((sum, film) => sum + film.indexValue, 0) / topFilms.length);

  return [
    `${positive} of ${topFilms.length} tracked films are positive over 7d.`,
    `average 7d movement is ${avgDelta7d >= 0 ? "+" : ""}${avgDelta7d.toFixed(1)} index points.`,
    `average genre film index is ${avgIndex.toFixed(1)}.`,
  ];
}

export async function getGenreVolatilityDistribution(
  genreSlug: string,
): Promise<GenreAnalyticsPayload["volatilityDistribution"]> {
  const films = await getGenreTopFilms(genreSlug, 100);
  if (!films.length) {
    return { stable: 0, moderate: 0, high: 0 };
  }

  const counts = { stable: 0, moderate: 0, high: 0 };
  for (const film of films) {
    if (film.volatilityClass === "stable") {
      counts.stable += 1;
    } else if (film.volatilityClass === "moderate") {
      counts.moderate += 1;
    } else if (film.volatilityClass === "high") {
      counts.high += 1;
    }
  }

  const total = films.length;
  return {
    stable: round2((counts.stable / total) * 100),
    moderate: round2((counts.moderate / total) * 100),
    high: round2((counts.high / total) * 100),
  };
}

export async function getGenreActorExposure(
  genreSlug: string,
  limit = 12,
): Promise<GenreAnalyticsPayload["actorExposure"]> {
  const genre = await resolveGenreBySlug(genreSlug);
  if (!genre) {
    return [];
  }

  const supabase = getSupabaseServiceClient();
  const { data: movies, error: moviesError } = await supabase.from("movies").select("id,genres").contains("genres", [genre]);
  if (moviesError) {
    throw moviesError;
  }

  const movieIds = (movies ?? []).map((row) => String(row.id));
  if (!movieIds.length) {
    return [];
  }

  const [{ data: actorMovieRows, error: actorMovieError }, { data: latestFilmRows, error: filmError }, { data: latestActorRows, error: actorError }] =
    await Promise.all([
      supabase.from("actor_movies").select("actor_id,movie_id,actor:actors(slug,name)").in("movie_id", movieIds),
      supabase.from("film_index_history").select("movie_id,index_value").order("as_of_date", { ascending: false }).in("movie_id", movieIds),
      supabase.from("actor_index_history").select("actor_id,index_value").order("as_of_date", { ascending: false }),
    ]);

  if (actorMovieError) {
    throw actorMovieError;
  }

  if (filmError) {
    throw filmError;
  }

  if (actorError) {
    throw actorError;
  }

  const filmIndexByMovie = new Map<string, number>();
  for (const row of (latestFilmRows ?? []) as Array<{ movie_id: string; index_value: number }>) {
    const movieId = String(row.movie_id);
    if (!filmIndexByMovie.has(movieId)) {
      filmIndexByMovie.set(movieId, Number(row.index_value));
    }
  }

  const actorIndexByActor = new Map<string, number | null>();
  for (const row of (latestActorRows ?? []) as Array<{ actor_id: string; index_value: number | null }>) {
    const actorId = String(row.actor_id);
    if (!actorIndexByActor.has(actorId)) {
      actorIndexByActor.set(actorId, row.index_value === null ? null : Number(row.index_value));
    }
  }

  const aggregates = new Map<
    string,
    { actorSlug: string | null; actorName: string; filmCount: number; indexTotal: number; contribution: number }
  >();
  let totalContribution = 0;

  for (const row of (actorMovieRows ?? []) as Array<{ actor_id: string; movie_id: string; actor?: { slug?: string; name?: string } | null }>) {
    const movieId = String(row.movie_id);
    const filmIndex = filmIndexByMovie.get(movieId) ?? 0;
    const actorId = String(row.actor_id);
    const current = aggregates.get(actorId) ?? {
      actorSlug: row.actor?.slug ? String(row.actor.slug) : null,
      actorName: row.actor?.name ? String(row.actor.name) : "actor",
      filmCount: 0,
      indexTotal: 0,
      contribution: 0,
    };

    current.filmCount += 1;
    current.indexTotal += filmIndex;
    current.contribution += Math.max(0, filmIndex);
    aggregates.set(actorId, current);
    totalContribution += Math.max(0, filmIndex);
  }

  return Array.from(aggregates.entries())
    .map(([actorId, metric]) => ({
      actorId,
      actorSlug: metric.actorSlug ?? actorId,
      actorName: metric.actorName,
      contributionPercent: totalContribution <= 0 ? 0 : round2((metric.contribution / totalContribution) * 100),
      avgFilmIndex: metric.filmCount ? round2(metric.indexTotal / metric.filmCount) : 0,
      actorIndex: actorIndexByActor.get(actorId) ?? null,
    }))
    .sort((left, right) => right.contributionPercent - left.contributionPercent)
    .slice(0, Math.max(1, limit));
}

export async function getRelatedGenres(genreSlug: string, limit = 8): Promise<PeerRow[]> {
  const genre = await resolveGenreBySlug(genreSlug);
  if (!genre) {
    return [];
  }

  const rows = await getLatestGenreRankings({ limit: 100, sortBy: "delta_7d", sortDir: "desc" });
  const target = rows.rows.find((row) => row.label.toLowerCase() === genre.toLowerCase());
  if (!target) {
    return [];
  }

  const targetSign = Math.sign(target.delta7d ?? 0);
  return rows.rows
    .filter((row) => row.id !== target.id && row.delta7d !== null && Math.sign(row.delta7d) === targetSign)
    .sort((left, right) => Math.abs((left.delta7d ?? 0) - (target.delta7d ?? 0)) - Math.abs((right.delta7d ?? 0) - (target.delta7d ?? 0)))
    .slice(0, Math.max(1, limit))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      label: row.label,
      entityType: "genre",
      actorSlug: null,
      actorName: null,
      indexValue: row.indexValue,
      delta7d: row.delta7d,
      volatilityClass: row.volatilityClass,
      rankPosition: row.rankPosition,
      similarityScore: round2(100 - Math.abs((row.delta7d ?? 0) - (target.delta7d ?? 0))),
    }));
}
