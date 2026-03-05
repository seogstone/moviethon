alter table public.film_index_history
  add column if not exists delta_1d numeric(6,2),
  add column if not exists rank_position integer,
  add column if not exists rank_change_1d integer;

alter table public.actor_index_history
  add column if not exists delta_1d numeric(6,2),
  add column if not exists rank_position integer,
  add column if not exists rank_change_1d integer;

alter table public.genre_index_history
  add column if not exists delta_1d numeric(6,2),
  add column if not exists rank_position integer,
  add column if not exists rank_change_1d integer;

alter table public.movie_daily_metrics
  add column if not exists ratings_count_24h integer not null default 0,
  add column if not exists comments_count_24h integer not null default 0,
  add column if not exists watchlist_adds_24h integer not null default 0,
  add column if not exists rating_velocity_ratio numeric(10,4);

create table if not exists public.global_index_history (
  as_of_date date not null,
  formula_version_id uuid not null references public.index_formula_versions(id) on delete restrict,
  index_value numeric(5,2) not null,
  delta_1d numeric(6,2),
  delta_7d numeric(6,2),
  delta_30d numeric(6,2),
  volatility_30d numeric(10,4),
  volatility_class text not null check (volatility_class in ('stable', 'moderate', 'high', 'insufficient')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (as_of_date, formula_version_id)
);

create index if not exists idx_film_index_history_as_of_rank
  on public.film_index_history(as_of_date desc, rank_position asc);

create index if not exists idx_actor_index_history_as_of_rank
  on public.actor_index_history(as_of_date desc, rank_position asc);

create index if not exists idx_genre_index_history_as_of_rank
  on public.genre_index_history(as_of_date desc, rank_position asc);

create index if not exists idx_film_index_history_delta1
  on public.film_index_history(as_of_date desc, delta_1d desc);

create index if not exists idx_actor_index_history_delta1
  on public.actor_index_history(as_of_date desc, delta_1d desc);

create index if not exists idx_genre_index_history_delta1
  on public.genre_index_history(as_of_date desc, delta_1d desc);

create index if not exists idx_global_index_history_as_of
  on public.global_index_history(as_of_date desc);

alter table public.global_index_history enable row level security;

create policy "public can read global index history"
  on public.global_index_history for select
  using (true);

create policy "service manages global index history"
  on public.global_index_history for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
