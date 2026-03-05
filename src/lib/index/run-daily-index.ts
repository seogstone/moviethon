import {
  collectActorIndexInputs,
  collectGenreIndexInputs,
  collectMovieIndexInputs,
  finishIndexRun,
  getGlobalIndexHistory,
  getActiveIndexFormulaVersion,
  startIndexRun,
  upsertActorIndexHistory,
  upsertFilmIndexHistory,
  upsertGlobalIndexHistory,
  upsertGenreIndexHistory,
  upsertMovieDailyMetrics,
} from "@/lib/data/index-queries";
import { computeActorIndex, computeGenreIndex } from "@/lib/index/compute-aggregates";
import { computeFilmIndex } from "@/lib/index/compute-film-index";
import { getSupabaseServiceClient } from "@/lib/data/supabase";
import { classifyVolatility } from "@/lib/index/methodology";
import type { ActorIndexHistoryRow, FilmIndexHistoryRow, GlobalIndexPoint, GenreIndexHistoryRow, MovieDailyMetrics } from "@/lib/types";

export interface DailyIndexRunResult {
  asOfDate: string;
  formulaVersion: string;
  runId: string;
  movieMetricsRows: number;
  filmRows: number;
  actorRows: number;
  genreRows: number;
}

function normalizeAsOfDate(input?: string | Date): Date {
  const base = input instanceof Date ? input : input ? new Date(input) : new Date();
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

type RankInput = { entityId: string; indexValue: number };
type PrevMapEntry = { rankPosition: number | null; indexValue: number | null };

function computeRanks(rows: RankInput[]): Map<string, number> {
  const sorted = [...rows].sort((left, right) => {
    if (right.indexValue !== left.indexValue) {
      return right.indexValue - left.indexValue;
    }
    return left.entityId.localeCompare(right.entityId);
  });

  const rankByEntity = new Map<string, number>();
  for (const [index, row] of sorted.entries()) {
    rankByEntity.set(row.entityId, index + 1);
  }

  return rankByEntity;
}

function addDays(date: Date, delta: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

async function getPreviousFilmMap(asOfDate: Date, formulaVersionId: string): Promise<Map<string, PrevMapEntry>> {
  const supabase = getSupabaseServiceClient();
  const previousAsOf = isoDate(addDays(asOfDate, -1));
  const { data, error } = await supabase
    .from("film_index_history")
    .select("movie_id,rank_position,index_value")
    .eq("as_of_date", previousAsOf)
    .eq("formula_version_id", formulaVersionId);

  if (error) {
    throw error;
  }

  const map = new Map<string, PrevMapEntry>();
  for (const row of (data ?? []) as Array<{ movie_id: string; rank_position: number | null; index_value: number | null }>) {
    map.set(String(row.movie_id), {
      rankPosition: row.rank_position === null ? null : Number(row.rank_position),
      indexValue: row.index_value === null ? null : Number(row.index_value),
    });
  }

  return map;
}

async function getPreviousActorMap(asOfDate: Date, formulaVersionId: string): Promise<Map<string, PrevMapEntry>> {
  const supabase = getSupabaseServiceClient();
  const previousAsOf = isoDate(addDays(asOfDate, -1));
  const { data, error } = await supabase
    .from("actor_index_history")
    .select("actor_id,rank_position,index_value")
    .eq("as_of_date", previousAsOf)
    .eq("formula_version_id", formulaVersionId);

  if (error) {
    throw error;
  }

  const map = new Map<string, PrevMapEntry>();
  for (const row of (data ?? []) as Array<{ actor_id: string; rank_position: number | null; index_value: number | null }>) {
    map.set(String(row.actor_id), {
      rankPosition: row.rank_position === null ? null : Number(row.rank_position),
      indexValue: row.index_value === null ? null : Number(row.index_value),
    });
  }

  return map;
}

async function getPreviousGenreMap(asOfDate: Date, formulaVersionId: string): Promise<Map<string, PrevMapEntry>> {
  const supabase = getSupabaseServiceClient();
  const previousAsOf = isoDate(addDays(asOfDate, -1));
  const { data, error } = await supabase
    .from("genre_index_history")
    .select("genre,rank_position,index_value")
    .eq("as_of_date", previousAsOf)
    .eq("formula_version_id", formulaVersionId);

  if (error) {
    throw error;
  }

  const map = new Map<string, PrevMapEntry>();
  for (const row of (data ?? []) as Array<{ genre: string; rank_position: number | null; index_value: number | null }>) {
    map.set(String(row.genre), {
      rankPosition: row.rank_position === null ? null : Number(row.rank_position),
      indexValue: row.index_value === null ? null : Number(row.index_value),
    });
  }

  return map;
}

export async function runDailyIndexPipeline(asOfInput?: string | Date): Promise<DailyIndexRunResult> {
  const asOfDate = normalizeAsOfDate(asOfInput);
  const formula = await getActiveIndexFormulaVersion();
  const run = await startIndexRun(asOfDate, formula.id);

  try {
    const { rows: movieInputs, globalMeanRating } = await collectMovieIndexInputs(asOfDate, formula.id);

    const movieMetricRows: MovieDailyMetrics[] = movieInputs.map((row) => ({
      movieId: row.movieId,
      asOfDate: isoDate(asOfDate),
      ratingsCount7d: row.ratingsCount7d,
      ratingsCount30d: row.ratingsCount30d,
      ratingsCount24h: row.ratingsCount24h,
      commentsCount7d: row.commentsCount7d,
      commentsCount30d: row.commentsCount30d,
      commentsCount24h: row.commentsCount24h,
      watchlistAdds24h: row.watchlistAdds24h,
      ratingVelocityRatio: row.ratingVelocityRatio,
      avgRating7d: row.avgRating7d,
      avgRating30d: row.avgRating30d,
      tmdbPopularity: row.tmdbPopularity,
      tmdbPopularityDelta: row.tmdbPopularityDelta,
    }));

    const computedFilmRows = movieInputs.map((row) => {
      const computed = computeFilmIndex(
        {
          movieId: row.movieId,
          releaseDate: row.releaseDate,
          imdbRating: row.imdbRating,
          tmdbPopularity: row.tmdbPopularity,
          tmdbPopularityDelta: row.tmdbPopularityDelta,
          ratingsCount7d: row.ratingsCount7d,
          ratingsCount30d: row.ratingsCount30d,
          commentsCount7d: row.commentsCount7d,
          commentsCount30d: row.commentsCount30d,
          watchlistAdds7d: row.watchlistAdds7d,
          watchlistAdds30d: row.watchlistAdds30d,
          avgRating7d: row.avgRating7d,
          avgRating30d: row.avgRating30d,
          allTimeAvgRating: row.allTimeAvgRating,
          allTimeRatingCount: row.allTimeRatingCount,
          previousIndex7d: row.previousIndex7d,
          previousIndex30d: row.previousIndex30d,
          previous30dSeries: row.previous30dSeries,
          previousQualityComponent: row.previousQualityComponent,
          previousVelocityComponent: row.previousVelocityComponent,
          previousEngagementComponent: row.previousEngagementComponent,
          previousExternalComponent: row.previousExternalComponent,
        },
        asOfDate,
        globalMeanRating,
      );

      return {
        movieId: row.movieId,
        asOfDate: isoDate(asOfDate),
        indexValue: computed.indexValue,
        computed,
      };
    });

    const previousFilmMap = await getPreviousFilmMap(asOfDate, formula.id);
    const filmRanks = computeRanks(computedFilmRows.map((row) => ({ entityId: row.movieId, indexValue: row.indexValue })));
    const filmRows: FilmIndexHistoryRow[] = computedFilmRows.map((row) => {
      const previous = previousFilmMap.get(row.movieId);
      const rankPosition = filmRanks.get(row.movieId) ?? null;
      const rankChange1d =
        rankPosition === null || previous?.rankPosition === null || previous?.rankPosition === undefined
          ? null
          : previous.rankPosition - rankPosition;

      return {
        movieId: row.movieId,
        asOfDate: isoDate(asOfDate),
        indexValue: row.indexValue,
        delta1d:
          previous?.indexValue === null || previous?.indexValue === undefined
            ? null
            : round2(row.indexValue - previous.indexValue),
        rankPosition,
        rankChange1d,
        qualityComponent: row.computed.qualityComponent,
        velocityComponent: row.computed.velocityComponent,
        engagementComponent: row.computed.engagementComponent,
        recencyComponent: row.computed.recencyComponent,
        externalComponent: row.computed.externalComponent,
        delta7d: row.computed.delta7d,
        delta30d: row.computed.delta30d,
        volatility30d: row.computed.volatility30d,
        volatilityClass: row.computed.volatilityClass,
        metadata: row.computed.metadata as Record<string, unknown>,
        formulaVersion: formula.versionKey,
      };
    });

    await upsertMovieDailyMetrics(asOfDate, movieMetricRows);
    await upsertFilmIndexHistory(asOfDate, formula.id, filmRows);

    const actorInputs = await collectActorIndexInputs(asOfDate, formula.id);
    const computedActorRows = actorInputs.map((row) => {
      const computed = computeActorIndex(
        {
          actorId: row.actorId,
          actorSlug: row.actorSlug,
          actorName: row.actorName,
          films: row.films,
          previousIndex7d: row.previousIndex7d,
          previousIndex30d: row.previousIndex30d,
          previous30dSeries: row.previous30dSeries,
        },
        asOfDate,
      );

      return {
        actorId: row.actorId,
        asOfDate: isoDate(asOfDate),
        indexValue: computed.indexValue,
        computed,
      };
    });

    const previousActorMap = await getPreviousActorMap(asOfDate, formula.id);
    const actorRanks = computeRanks(computedActorRows.map((row) => ({ entityId: row.actorId, indexValue: row.indexValue })));
    const actorRows: ActorIndexHistoryRow[] = computedActorRows.map((row) => {
      const previous = previousActorMap.get(row.actorId);
      const rankPosition = actorRanks.get(row.actorId) ?? null;
      const rankChange1d =
        rankPosition === null || previous?.rankPosition === null || previous?.rankPosition === undefined
          ? null
          : previous.rankPosition - rankPosition;

      return {
        actorId: row.actorId,
        asOfDate: isoDate(asOfDate),
        indexValue: row.indexValue,
        delta1d:
          previous?.indexValue === null || previous?.indexValue === undefined
            ? null
            : round2(row.indexValue - previous.indexValue),
        rankPosition,
        rankChange1d,
        delta7d: row.computed.delta7d,
        delta30d: row.computed.delta30d,
        volatility30d: row.computed.volatility30d,
        volatilityClass: row.computed.volatilityClass,
        contribution: row.computed.contributions as Array<Record<string, unknown>>,
        formulaVersion: formula.versionKey,
      };
    });

    await upsertActorIndexHistory(asOfDate, formula.id, actorRows);

    const genreInputs = await collectGenreIndexInputs(asOfDate, formula.id);
    const computedGenreRows = genreInputs.map((row) => {
      const computed = computeGenreIndex({
        genre: row.genre,
        movieIndexes: row.movieIndexes,
        previousIndex7d: row.previousIndex7d,
        previousIndex30d: row.previousIndex30d,
        previous30dSeries: row.previous30dSeries,
      });

      return {
        genre: row.genre,
        asOfDate: isoDate(asOfDate),
        indexValue: computed.indexValue,
        computed,
      };
    });

    const previousGenreMap = await getPreviousGenreMap(asOfDate, formula.id);
    const genreRanks = computeRanks(computedGenreRows.map((row) => ({ entityId: row.genre, indexValue: row.indexValue })));
    const genreRows: GenreIndexHistoryRow[] = computedGenreRows.map((row) => {
      const previous = previousGenreMap.get(row.genre);
      const rankPosition = genreRanks.get(row.genre) ?? null;
      const rankChange1d =
        rankPosition === null || previous?.rankPosition === null || previous?.rankPosition === undefined
          ? null
          : previous.rankPosition - rankPosition;

      return {
        genre: row.genre,
        asOfDate: isoDate(asOfDate),
        indexValue: row.indexValue,
        delta1d:
          previous?.indexValue === null || previous?.indexValue === undefined
            ? null
            : round2(row.indexValue - previous.indexValue),
        rankPosition,
        rankChange1d,
        delta7d: row.computed.delta7d,
        delta30d: row.computed.delta30d,
        volatility30d: row.computed.volatility30d,
        volatilityClass: row.computed.volatilityClass,
        formulaVersion: formula.versionKey,
      };
    });

    await upsertGenreIndexHistory(asOfDate, formula.id, genreRows);

    const globalIndexValue = round2(mean(filmRows.map((row) => row.indexValue)));
    const previousGlobal = await getGlobalIndexHistory(31);
    const byDate = new Map(previousGlobal.map((row) => [row.asOfDate, row]));
    const prev1d = byDate.get(isoDate(addDays(asOfDate, -1)));
    const prev7d = byDate.get(isoDate(addDays(asOfDate, -7)));
    const prev30d = byDate.get(isoDate(addDays(asOfDate, -30)));
    const volatilitySeries = [...previousGlobal.slice(0, 29).map((row) => row.indexValue), globalIndexValue];
    const volatility30d = stdDev(volatilitySeries);
    const globalPoint: GlobalIndexPoint = {
      asOfDate: isoDate(asOfDate),
      indexValue: globalIndexValue,
      delta1d: prev1d ? round2(globalIndexValue - prev1d.indexValue) : null,
      delta7d: prev7d ? round2(globalIndexValue - prev7d.indexValue) : null,
      delta30d: prev30d ? round2(globalIndexValue - prev30d.indexValue) : null,
      volatility30d: volatility30d === null ? null : round2(volatility30d),
      volatilityClass: classifyVolatility(volatility30d),
      formulaVersion: formula.versionKey,
    };
    await upsertGlobalIndexHistory(asOfDate, formula.id, globalPoint);

    const summary = {
      formulaVersion: formula.versionKey,
      movieMetricsRows: movieMetricRows.length,
      filmRows: filmRows.length,
      actorRows: actorRows.length,
      genreRows: genreRows.length,
      globalIndexValue,
    };

    await finishIndexRun(run.id, "success", summary, null);

    return {
      asOfDate: isoDate(asOfDate),
      formulaVersion: formula.versionKey,
      runId: run.id,
      movieMetricsRows: movieMetricRows.length,
      filmRows: filmRows.length,
      actorRows: actorRows.length,
      genreRows: genreRows.length,
    };
  } catch (error) {
    await finishIndexRun(
      run.id,
      "failed",
      null,
      {
        message: error instanceof Error ? error.message : "Index run failed",
      },
    );

    throw error;
  }
}
