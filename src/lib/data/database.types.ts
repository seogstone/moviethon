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
      index_formula_versions: GenericTable;
      index_runs: GenericTable;
      movie_daily_metrics: GenericTable;
      film_index_history: GenericTable;
      actor_movie_role_weights: GenericTable;
      actor_index_history: GenericTable;
      genre_index_history: GenericTable;
      global_index_history: GenericTable;
      user_vote_events: GenericTable;
      comment_events: GenericTable;
    };
    Views: {
      movie_rating_stats: GenericView;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
