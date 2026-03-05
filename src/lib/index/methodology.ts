export type VolatilityClass = "stable" | "moderate" | "high" | "insufficient";

export interface IndexWeights {
  quality: number;
  velocity: number;
  engagement: number;
  recency: number;
  external: number;
}

export interface IndexNormalizationConfig {
  scoreRange: [number, number];
  bayesianPriorStrength: number;
  confidenceScale: number;
  recencyHalfLifeDays: number;
}

export interface IndexMethodology {
  versionKey: string;
  weights: IndexWeights;
  normalization: IndexNormalizationConfig;
  description: string;
  changelog: string;
}

export const INDEX_V1_KEY = "INDEX_V1";

export const INDEX_V1_METHOD: IndexMethodology = {
  versionKey: INDEX_V1_KEY,
  weights: {
    quality: 0.55,
    velocity: 0.18,
    engagement: 0.12,
    recency: 0,
    external: 0.15,
  },
  normalization: {
    scoreRange: [0, 100],
    bayesianPriorStrength: 50,
    confidenceScale: 40,
    recencyHalfLifeDays: 365,
  },
  description:
    "Moviethon Index converts Bayesian quality, momentum velocity, engagement velocity, external attention, recency-adjusted momentum, and confidence damping into a governed 0-100 score.",
  changelog: "Aligned with index_formula.md: log2 velocity/engagement, momentum recency adjustment, and confidence damping.",
};

export const VOLATILITY_THRESHOLDS = {
  stableMax: 3,
  moderateMax: 7,
};

export function classifyVolatility(stdDev30d: number | null): VolatilityClass {
  if (stdDev30d === null || Number.isNaN(stdDev30d)) {
    return "insufficient";
  }

  if (stdDev30d <= VOLATILITY_THRESHOLDS.stableMax) {
    return "stable";
  }

  if (stdDev30d <= VOLATILITY_THRESHOLDS.moderateMax) {
    return "moderate";
  }

  return "high";
}
