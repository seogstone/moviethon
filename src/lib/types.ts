export type SortBy = "release_date" | "imdb" | "community" | "owner";
export type SortDir = "asc" | "desc";

export interface Actor {
  id: string;
  slug: string;
  name: string;
  heroImage: string | null;
  bio: string | null;
  isFeatured: boolean;
}

export interface Movie {
  id: string;
  actorId: string;
  slug: string;
  title: string;
  releaseDate: string;
  decade: number;
  genres: string[];
  posterUrl: string | null;
  imdbId: string | null;
  tmdbId: number | null;
  synopsis: string | null;
  runtimeMinutes: number | null;
}

export interface MovieRatings {
  imdbScore: number | null;
  ownerScore: number | null;
  communityAvg: number;
  communityCount: number;
}

export interface MovieWithRatings extends Movie {
  ratings: MovieRatings;
  curatedRank: number;
}

export interface GuestVote {
  movieId: string;
  guestKeyHash: string;
  score: number;
  updatedAt: string;
}

export type CommentStatus = "visible" | "hidden" | "deleted";

export interface Comment {
  id: string;
  movieId: string;
  displayName: string;
  body: string;
  createdAt: string;
  status: CommentStatus;
}

export interface CommentReport {
  commentId: string;
  reason: string;
  reporterKeyHash: string;
  createdAt: string;
}

export interface MovieFilters {
  decade?: number;
  genre?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
}

export interface PaginatedComments {
  comments: Comment[];
  page: number;
  pageSize: number;
  total: number;
}
