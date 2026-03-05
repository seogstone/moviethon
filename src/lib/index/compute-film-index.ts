import { classifyVolatility, INDEX_V1_METHOD, type VolatilityClass } from "@/lib/index/methodology";

export interface FilmMetricInput {
  movieId: string;
  releaseDate: string;
  imdbRating: number | null;
  tmdbPopularity: number | null;
  tmdbPopularityDelta: number | null;
  ratingsCount7d: number;
  ratingsCount30d: number;
  commentsCount7d: number;
  commentsCount30d: number;
  watchlistAdds7d: number;
  watchlistAdds30d: number;
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

export interface FilmIndexComputed {
  movieId: string;
  indexValue: number;
  qualityComponent: number;
  velocityComponent: number;
  engagementComponent: number;
  recencyComponent: number;
  externalComponent: number;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
  metadata: {
    bayesianRating: number;
    velocityRatio: number;
    engagementRatio: number;
    confidence: number;
    yearsSinceRelease: number;
    ratingsCount7d: number;
    ratingsCount30d: number;
    commentsCount7d: number;
    commentsCount30d: number;
    watchlistAdds7d: number;
    watchlistAdds30d: number;
    qualityDelta: number | null;
    velocityDelta: number | null;
    engagementDelta: number | null;
    externalDelta: number | null;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeNumber(value: number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return value;
}

function toScore100From10(score: number): number {
  return clamp(score * 10, 0, 100);
}

function daysBetween(from: Date, to: Date): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

function computeStdDev(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeBayesianRating(
  avgRating: number | null,
  ratingCount: number,
  globalMean: number,
  priorStrength = INDEX_V1_METHOD.normalization.bayesianPriorStrength,
): number {
  const safeAvg = safeNumber(avgRating, globalMean);
  const n = Math.max(0, ratingCount);
  const m = Math.max(1, priorStrength);

  return (n / (n + m)) * safeAvg + (m / (n + m)) * globalMean;
}

export function computeFilmIndex(input: FilmMetricInput, asOfDate: Date, globalMeanRating: number): FilmIndexComputed {
  const normalization = INDEX_V1_METHOD.normalization;

  const bayesianRating = computeBayesianRating(
    input.allTimeAvgRating,
    input.allTimeRatingCount,
    globalMeanRating,
    normalization.bayesianPriorStrength,
  );
  const qualityComponent = toScore100From10(bayesianRating);

  const velocityRate7d = input.ratingsCount7d / 7;
  const velocityRate30d = Math.max(1, input.ratingsCount30d / 30);
  const velocityRatio = velocityRate7d / velocityRate30d;
  const velocityComponent =
    velocityRatio > 0 ? clamp(50 + 20 * Math.log2(velocityRatio), 0, 100) : 0;

  const engagement7d = input.ratingsCount7d + input.commentsCount7d * 0.5 + input.watchlistAdds7d * 0.25;
  const engagement30d = input.ratingsCount30d + input.commentsCount30d * 0.5 + input.watchlistAdds30d * 0.25;
  const engagementRate7d = engagement7d / 7;
  const engagementRate30d = Math.max(1, engagement30d / 30);
  const engagementRatio = engagementRate7d / engagementRate30d;
  const engagementComponent =
    engagementRatio > 0 ? clamp(50 + 20 * Math.log2(engagementRatio), 0, 100) : 0;

  const releaseDate = new Date(input.releaseDate);
  const daysSinceRelease = daysBetween(releaseDate, asOfDate);
  const yearsSinceRelease = daysSinceRelease / 365;
  const recencyMultiplier = Math.exp(-daysSinceRelease / normalization.recencyHalfLifeDays);
  const recencyComponent = clamp(recencyMultiplier * 100, 0, 100);

  const imdbExternal = input.imdbRating ? toScore100From10(input.imdbRating) : 50;
  const popularityDelta = clamp(safeNumber(input.tmdbPopularityDelta, 0), -20, 20);
  const popularitySignal = clamp(50 + popularityDelta * 2.5, 0, 100);
  const externalComponent = clamp(imdbExternal * 0.35 + popularitySignal * 0.65, 0, 100);

  const momentum = 0.6 * velocityComponent + 0.4 * engagementComponent;
  const momentumAdjusted = 50 + (momentum - 50) * recencyMultiplier;

  const indexRaw = 0.55 * qualityComponent + 0.3 * momentumAdjusted + 0.15 * externalComponent;
  const confidence = 1 - Math.exp(-Math.max(0, input.allTimeRatingCount) / normalization.confidenceScale);
  const indexValue = clamp(0.7 * indexRaw + 0.3 * (indexRaw * confidence), 0, 100);

  const historyForVolatility = [...input.previous30dSeries, indexValue].slice(-30);
  const volatility30d = computeStdDev(historyForVolatility);
  const volatilityClass = classifyVolatility(volatility30d);

  return {
    movieId: input.movieId,
    indexValue: round2(indexValue),
    qualityComponent: round2(qualityComponent),
    velocityComponent: round2(velocityComponent),
    engagementComponent: round2(engagementComponent),
    recencyComponent: round2(recencyComponent),
    externalComponent: round2(externalComponent),
    delta7d: input.previousIndex7d === null ? null : round2(indexValue - input.previousIndex7d),
    delta30d: input.previousIndex30d === null ? null : round2(indexValue - input.previousIndex30d),
    volatility30d: volatility30d === null ? null : round2(volatility30d),
    volatilityClass,
    metadata: {
      bayesianRating: round2(bayesianRating),
      velocityRatio: round2(velocityRatio),
      engagementRatio: round2(engagementRatio),
      confidence: round2(confidence),
      yearsSinceRelease: round2(yearsSinceRelease),
      ratingsCount7d: input.ratingsCount7d,
      ratingsCount30d: input.ratingsCount30d,
      commentsCount7d: input.commentsCount7d,
      commentsCount30d: input.commentsCount30d,
      watchlistAdds7d: input.watchlistAdds7d,
      watchlistAdds30d: input.watchlistAdds30d,
      qualityDelta:
        input.previousQualityComponent === null ? null : round2(qualityComponent - input.previousQualityComponent),
      velocityDelta:
        input.previousVelocityComponent === null ? null : round2(velocityComponent - input.previousVelocityComponent),
      engagementDelta:
        input.previousEngagementComponent === null
          ? null
          : round2(engagementComponent - input.previousEngagementComponent),
      externalDelta:
        input.previousExternalComponent === null ? null : round2(externalComponent - input.previousExternalComponent),
    },
  };
}
