type GenericRow = Record<string, unknown>;

interface GenericTable {
  Row: GenericRow;
  Insert: GenericRow;
  Update: GenericRow;
  Relationships: never[];
}

interface GenericView {
  Row: GenericRow;
  Relationships: never[];
}

export interface Database {
  public: {
    Tables: {
      actors: GenericTable;
      movies: GenericTable;
      actor_movies: GenericTable;
      owner_ratings: GenericTable;
      guest_votes: GenericTable;
      app_users: GenericTable;
      user_votes: GenericTable;
      user_watchlist: GenericTable;
      comments: GenericTable;
      comment_reports: GenericTable;
      sync_runs: GenericTable;
      api_rate_limits: GenericTable;
    };
    Views: {
      movie_rating_stats: GenericView;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
