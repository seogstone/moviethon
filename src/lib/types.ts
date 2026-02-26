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
  myRating?: number | null;
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
  userId?: string | null;
  isVerifiedUser?: boolean;
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

export interface AppUser {
  id: string;
  auth0Sub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserVote {
  movieId: string;
  userId: string;
  score: number;
  updatedAt: string;
}

export interface MyRatingItem {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  actorSlug: string | null;
  actorName: string | null;
  posterUrl: string | null;
  score: number;
  updatedAt: string;
}

export interface MyRatingsPage {
  items: MyRatingItem[];
  page: number;
  pageSize: number;
  total: number;
}
