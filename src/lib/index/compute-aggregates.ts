import { classifyVolatility, type VolatilityClass } from "@/lib/index/methodology";

export interface ActorIndexMovieContribution {
  movieId: string;
  movieTitle: string;
  releaseDate: string;
  filmIndex: number;
  roleWeight: number;
}

export interface ActorMetricInput {
  actorId: string;
  actorSlug: string;
  actorName: string;
  films: ActorIndexMovieContribution[];
  previousIndex7d: number | null;
  previousIndex30d: number | null;
  previous30dSeries: number[];
}

export interface ActorIndexComputed {
  actorId: string;
  indexValue: number;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
  contributions: Array<{
    movieId: string;
    movieTitle: string;
    contribution: number;
    filmIndex: number;
    roleWeight: number;
  }>;
}

export interface GenreMetricInput {
  genre: string;
  movieIndexes: number[];
  previousIndex7d: number | null;
  previousIndex30d: number | null;
  previous30dSeries: number[];
}

export interface GenreIndexComputed {
  genre: string;
  indexValue: number;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const avg = mean(values);
  if (avg === null) {
    return null;
  }

  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function yearsSinceRelease(releaseDate: string, asOfDate: Date): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const diff = Math.max(0, asOfDate.getTime() - new Date(releaseDate).getTime());
  return diff / DAY_MS / 365;
}

export function computeActorIndex(input: ActorMetricInput, asOfDate: Date): ActorIndexComputed {
  if (!input.films.length) {
    return {
      actorId: input.actorId,
      indexValue: 0,
      delta7d: null,
      delta30d: null,
      volatility30d: null,
      volatilityClass: "insufficient",
      contributions: [],
    };
  }

  const contributionRows = input.films.map((film) => {
    const decay = clamp(Math.exp(-yearsSinceRelease(film.releaseDate, asOfDate) / 22), 0.25, 1);
    const weightedContribution = film.filmIndex * film.roleWeight * decay;
    return {
      movieId: film.movieId,
      movieTitle: film.movieTitle,
      roleWeight: film.roleWeight,
      filmIndex: film.filmIndex,
      weight: film.roleWeight * decay,
      weightedContribution,
    };
  });

  const numerator = contributionRows.reduce((sum, row) => sum + row.weightedContribution, 0);
  const denominator = contributionRows.reduce((sum, row) => sum + row.weight, 0);
  const indexValue = denominator > 0 ? clamp(numerator / denominator, 0, 100) : 0;

  const history = [...input.previous30dSeries, indexValue].slice(-30);
  const volatility30d = stdDev(history);

  return {
    actorId: input.actorId,
    indexValue: round2(indexValue),
    delta7d: input.previousIndex7d === null ? null : round2(indexValue - input.previousIndex7d),
    delta30d: input.previousIndex30d === null ? null : round2(indexValue - input.previousIndex30d),
    volatility30d: volatility30d === null ? null : round2(volatility30d),
    volatilityClass: classifyVolatility(volatility30d),
    contributions: contributionRows
      .map((row) => ({
        movieId: row.movieId,
        movieTitle: row.movieTitle,
        contribution: round2(row.weightedContribution),
        filmIndex: round2(row.filmIndex),
        roleWeight: round2(row.roleWeight),
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 8),
  };
}

export function computeGenreIndex(input: GenreMetricInput): GenreIndexComputed {
  const avg = mean(input.movieIndexes) ?? 0;
  const history = [...input.previous30dSeries, avg].slice(-30);
  const volatility30d = stdDev(history);

  return {
    genre: input.genre,
    indexValue: round2(clamp(avg, 0, 100)),
    delta7d: input.previousIndex7d === null ? null : round2(avg - input.previousIndex7d),
    delta30d: input.previousIndex30d === null ? null : round2(avg - input.previousIndex30d),
    volatility30d: volatility30d === null ? null : round2(volatility30d),
    volatilityClass: classifyVolatility(volatility30d),
  };
}
