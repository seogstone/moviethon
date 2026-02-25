import { z } from "zod";

export const ratingPayloadSchema = z.object({
  score: z.number().min(1).max(10),
  captchaToken: z.string().min(1),
});

export const commentPayloadSchema = z.object({
  displayName: z.string().min(2).max(50),
  body: z.string().min(2).max(1000),
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
