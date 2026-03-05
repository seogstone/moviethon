export type SortBy = "release_date" | "imdb" | "community" | "owner";
export type SortDir = "asc" | "desc";
export type ChartRange = "7d" | "30d" | "90d" | "1y" | "all";

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
  displayName: string | null;
  bio: string | null;
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

export interface WatchlistItem {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  actorSlug: string | null;
  actorName: string | null;
  posterUrl: string | null;
  addedAt: string;
}

export interface WatchlistPage {
  items: WatchlistItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ActorMarketMetric {
  actorId: string;
  actorSlug: string;
  actorName: string;
  ratings7d: number;
  ratingsPrev7d: number;
  avgRatingAllTime: number | null;
  voteCountAllTime: number;
  currentAvg7d: number | null;
  previousAvg7d: number | null;
  gainerDelta7d: number | null;
  comments7d: number;
  activitySpark14d: number[];
}

export interface ActorRollupRatings {
  imdbAvg: number | null;
  imdbMovieCount: number;
  ownerAvg: number | null;
  ownerMovieCount: number;
  communityAvg: number | null;
  communityVoteCount: number;
}

export interface HomepageMarketPayload {
  generatedAt: string;
  windowDays: number;
  sparkDays: number;
  minVotesForDelta: number;
  leaderboards: {
    movers: ActorMarketMetric[];
    gainers: ActorMarketMetric[];
    discussed: ActorMarketMetric[];
  };
  actors: ActorMarketMetric[];
}

export type VolatilityClass = "stable" | "moderate" | "high" | "insufficient";

export interface IndexFormulaVersion {
  id: string;
  versionKey: string;
  weights: Record<string, number>;
  normalization: Record<string, unknown>;
  changelog: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IndexRun {
  id: string;
  asOfDate: string;
  formulaVersionId: string;
  status: string;
  summary: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovieDailyMetrics {
  movieId: string;
  asOfDate: string;
  ratingsCount7d: number;
  ratingsCount30d: number;
  ratingsCount24h: number;
  commentsCount7d: number;
  commentsCount30d: number;
  commentsCount24h: number;
  watchlistAdds24h: number;
  ratingVelocityRatio: number | null;
  avgRating7d: number | null;
  avgRating30d: number | null;
  tmdbPopularity: number | null;
  tmdbPopularityDelta: number | null;
}

export interface FilmIndexHistoryRow {
  movieId: string;
  asOfDate: string;
  indexValue: number;
  delta1d: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  qualityComponent: number;
  velocityComponent: number;
  engagementComponent: number;
  recencyComponent: number;
  externalComponent: number;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
  metadata: Record<string, unknown>;
  formulaVersion: string | null;
}

export interface ActorIndexHistoryRow {
  actorId: string;
  asOfDate: string;
  indexValue: number;
  delta1d: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
  contribution: Array<Record<string, unknown>>;
  formulaVersion: string | null;
}

export interface GenreIndexHistoryRow {
  genre: string;
  asOfDate: string;
  indexValue: number;
  delta1d: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
  formulaVersion: string | null;
}

export interface RankingRow {
  id: string;
  label: string;
  slug: string;
  entityType: "film" | "actor" | "genre";
  actorSlug: string | null;
  actorName: string | null;
  indexValue: number;
  delta1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  volatilityClass: VolatilityClass;
  asOfDate: string;
  trendPoints?: number[];
  confidenceScore?: number | null;
}

export interface GlobalIndexPoint {
  asOfDate: string;
  indexValue: number;
  delta1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  volatility30d: number | null;
  volatilityClass: VolatilityClass;
  formulaVersion: string | null;
}

export interface PeerRow {
  id: string;
  slug: string;
  label: string;
  entityType: "film" | "actor" | "genre";
  actorSlug: string | null;
  actorName: string | null;
  indexValue: number;
  delta7d: number | null;
  volatilityClass: VolatilityClass;
  rankPosition: number | null;
  similarityScore: number;
}

export interface CommunityVelocityRow {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  actorSlug: string | null;
  actorName: string | null;
  newRatings24h: number;
  ratingVelocityRatio: number | null;
  comments24h: number;
}

export interface SnapshotRow {
  asOfDate: string;
  indexValue: number;
  rankPosition: number | null;
  delta1d: number | null;
  ratingScore: number | null;
  velocityScore: number | null;
  externalScore: number | null;
}

export interface FilmAnalyticsPayload {
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
  trend: Array<{ date: string; value: number }>;
  snapshots: SnapshotRow[];
  peers: PeerRow[];
  alsoMoving: PeerRow[];
  communityVelocity: {
    ratings24h: number;
    comments24h: number;
    velocityRatio: number | null;
    trend: number[];
  };
}

export interface ActorAnalyticsPayload {
  actorId: string;
  actorSlug: string;
  actorName: string;
  indexCurrent: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  delta1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  volatilityClass: VolatilityClass;
  trend: Array<{ date: string; value: number }>;
  snapshots: SnapshotRow[];
  peers: PeerRow[];
  alsoMoving: PeerRow[];
  topGenres: Array<{ genre: string; contributionPercent: number; averageFilmIndex: number }>;
  contributions: Array<{ movieId: string; movieSlug: string; title: string; roleWeight: number; filmIndex: number; contributionPercent: number; filmDelta7d: number | null }>;
}

export interface GenreAnalyticsPayload {
  genre: string;
  indexCurrent: number | null;
  rankPosition: number | null;
  rankChange1d: number | null;
  delta1d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  volatilityClass: VolatilityClass;
  trend: Array<{ date: string; value: number }>;
  topFilms: PeerRow[];
  relatedGenres: PeerRow[];
  insights: string[];
  volatilityDistribution: { stable: number; moderate: number; high: number };
  actorExposure: Array<{ actorId: string; actorSlug: string; actorName: string; contributionPercent: number; avgFilmIndex: number; actorIndex: number | null }>;
}

export interface IndexHealth {
  ok: boolean;
  stale: boolean;
  latestAsOfDate: string | null;
  latestRunStatus: string | null;
  latestRunFinishedAt: string | null;
  runSummary: Record<string, unknown> | null;
  runError: Record<string, unknown> | null;
  secondsSinceLastRun: number | null;
}

export interface IndexAnomaly {
  movieId: string;
  movieTitle: string;
  actorSlug: string | null;
  actorName: string | null;
  indexValue: number;
  delta7d: number | null;
  volatilityClass: VolatilityClass;
  ratingsCount7d: number;
  ratingsCount30d: number;
  commentsCount7d: number;
  confidenceScore: number;
  reasons: string[];
}
