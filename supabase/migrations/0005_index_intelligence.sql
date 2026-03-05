create table if not exists public.index_formula_versions (
  id uuid primary key default gen_random_uuid(),
  version_key text not null unique,
  weights_json jsonb not null,
  normalization_json jsonb not null default '{}'::jsonb,
  changelog text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_index_formula_active_unique
  on public.index_formula_versions(is_active)
  where is_active = true;

create table if not exists public.index_runs (
  id uuid primary key default gen_random_uuid(),
  as_of_date date not null,
  formula_version_id uuid not null references public.index_formula_versions(id) on delete restrict,
  status text not null check (status in ('running', 'success', 'failed', 'partial')),
  summary_json jsonb,
  error_json jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (as_of_date, formula_version_id)
);

create table if not exists public.movie_daily_metrics (
  movie_id uuid not null references public.movies(id) on delete cascade,
  as_of_date date not null,
  ratings_count_7d integer not null default 0,
  ratings_count_30d integer not null default 0,
  comments_count_7d integer not null default 0,
  comments_count_30d integer not null default 0,
  avg_rating_7d numeric(4,2),
  avg_rating_30d numeric(4,2),
  tmdb_popularity numeric(8,2),
  tmdb_popularity_delta numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (movie_id, as_of_date)
);

create table if not exists public.film_index_history (
  movie_id uuid not null references public.movies(id) on delete cascade,
  as_of_date date not null,
  formula_version_id uuid not null references public.index_formula_versions(id) on delete restrict,
  index_value numeric(5,2) not null,
  quality_component numeric(5,2) not null,
  velocity_component numeric(5,2) not null,
  engagement_component numeric(5,2) not null,
  recency_component numeric(5,2) not null,
  external_component numeric(5,2) not null,
  delta_7d numeric(6,2),
  delta_30d numeric(6,2),
  volatility_30d numeric(10,4),
  volatility_class text not null check (volatility_class in ('stable', 'moderate', 'high', 'insufficient')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (movie_id, as_of_date, formula_version_id)
);

create table if not exists public.actor_movie_role_weights (
  actor_id uuid not null references public.actors(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  role_key text not null default 'lead' check (role_key in ('lead', 'supporting', 'cameo')),
  role_weight numeric(3,2) not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, movie_id)
);

create table if not exists public.actor_index_history (
  actor_id uuid not null references public.actors(id) on delete cascade,
  as_of_date date not null,
  formula_version_id uuid not null references public.index_formula_versions(id) on delete restrict,
  index_value numeric(5,2) not null,
  delta_7d numeric(6,2),
  delta_30d numeric(6,2),
  volatility_30d numeric(10,4),
  volatility_class text not null check (volatility_class in ('stable', 'moderate', 'high', 'insufficient')),
  contribution_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, as_of_date, formula_version_id)
);

create table if not exists public.genre_index_history (
  genre text not null,
  as_of_date date not null,
  formula_version_id uuid not null references public.index_formula_versions(id) on delete restrict,
  index_value numeric(5,2) not null,
  delta_7d numeric(6,2),
  delta_30d numeric(6,2),
  volatility_30d numeric(10,4),
  volatility_class text not null check (volatility_class in ('stable', 'moderate', 'high', 'insufficient')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (genre, as_of_date, formula_version_id)
);

create table if not exists public.user_vote_events (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  previous_score numeric(3,1),
  new_score numeric(3,1) not null,
  event_type text not null check (event_type in ('create', 'update')),
  source text not null default 'app',
  created_at timestamptz not null default now()
);

create table if not exists public.comment_events (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'hidden', 'deleted')),
  created_at timestamptz not null default now()
);

create index if not exists idx_movie_daily_metrics_as_of_date
  on public.movie_daily_metrics(as_of_date desc);

create index if not exists idx_film_index_history_as_of_date
  on public.film_index_history(as_of_date desc);

create index if not exists idx_film_index_history_rank
  on public.film_index_history(as_of_date desc, index_value desc, delta_7d desc);

create index if not exists idx_actor_index_history_as_of_date
  on public.actor_index_history(as_of_date desc);

create index if not exists idx_actor_index_history_rank
  on public.actor_index_history(as_of_date desc, index_value desc, delta_7d desc);

create index if not exists idx_genre_index_history_as_of_date
  on public.genre_index_history(as_of_date desc);

create index if not exists idx_user_vote_events_movie_created
  on public.user_vote_events(movie_id, created_at desc);

create index if not exists idx_comment_events_movie_created
  on public.comment_events(movie_id, created_at desc);

alter table public.index_formula_versions enable row level security;
alter table public.index_runs enable row level security;
alter table public.movie_daily_metrics enable row level security;
alter table public.film_index_history enable row level security;
alter table public.actor_movie_role_weights enable row level security;
alter table public.actor_index_history enable row level security;
alter table public.genre_index_history enable row level security;
alter table public.user_vote_events enable row level security;
alter table public.comment_events enable row level security;

create policy "public can read index formulas"
  on public.index_formula_versions for select
  using (true);

create policy "public can read movie metrics"
  on public.movie_daily_metrics for select
  using (true);

create policy "public can read film index history"
  on public.film_index_history for select
  using (true);

create policy "public can read actor index history"
  on public.actor_index_history for select
  using (true);

create policy "public can read genre index history"
  on public.genre_index_history for select
  using (true);

create policy "service manages index formulas"
  on public.index_formula_versions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages index runs"
  on public.index_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages movie metrics"
  on public.movie_daily_metrics for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages film index history"
  on public.film_index_history for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages actor role weights"
  on public.actor_movie_role_weights for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages actor index history"
  on public.actor_index_history for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages genre index history"
  on public.genre_index_history for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages user vote events"
  on public.user_vote_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages comment events"
  on public.comment_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

update public.index_formula_versions
set is_active = false,
    updated_at = now()
where version_key <> 'INDEX_V1'
  and is_active = true;

insert into public.index_formula_versions (
  version_key,
  weights_json,
  normalization_json,
  changelog,
  is_active,
  created_at,
  updated_at
)
values (
  'INDEX_V1',
  '{"quality":0.55,"velocity":0.18,"engagement":0.12,"recency":0,"external":0.15}'::jsonb,
  '{"scoreRange":[0,100],"bayesianPriorStrength":50,"confidenceScale":40,"recencyHalfLifeDays":365}'::jsonb,
  'Aligned with index_formula.md: Bayesian quality, log2 momentum ratios, recency-adjusted momentum, and confidence damping.',
  true,
  now(),
  now()
)
on conflict (version_key)
do update set
  weights_json = excluded.weights_json,
  normalization_json = excluded.normalization_json,
  changelog = excluded.changelog,
  is_active = true,
  updated_at = now();
