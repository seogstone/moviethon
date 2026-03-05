import { z } from "zod";

export const ratingPayloadSchema = z.object({
  score: z.number().min(1).max(10),
  captchaToken: z.string().min(1),
});

export const commentPayloadSchema = z.object({
  body: z.string().min(2).max(1000),
  captchaToken: z.string().min(1),
});

export const contributionPayloadSchema = z.object({
  score: z.number().min(1).max(10).optional(),
  body: z.string().min(2).max(1000).optional(),
  captchaToken: z.string().min(1),
});

export const commentReportSchema = z.object({
  reason: z.string().min(3).max(300),
});

export const commentDeleteSchema = z.object({
  token: z.string().min(8),
});

export const actorMovieFilterSchema = z.object({
  decade: z.coerce.number().optional(),
  genre: z.string().optional(),
  sortBy: z.enum(["release_date", "imdb", "community", "owner"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const userProfileUpdateSchema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(280).optional().nullable(),
});

export const marketActorsQuerySchema = z.object({
  scope: z.enum(["featured", "all"]).optional(),
  windowDays: z.coerce.number().int().min(1).max(30).optional(),
  sparkDays: z.coerce.number().int().min(1).max(30).optional(),
  minVotesForDelta: z.coerce.number().int().min(1).max(50).optional(),
});

export const rankingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(["index", "delta_7d", "volatility"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const moverRankingQuerySchema = z.object({
  type: z.enum(["gainers", "decliners"]).default("gainers"),
  window: z.enum(["24h", "7d"]).default("7d"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const indexHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(120).optional(),
});

export const globalHistoryQuerySchema = z.object({
  days: z.union([z.literal("all"), z.coerce.number().int().min(1).max(3650)]).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

export const optionalLimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
