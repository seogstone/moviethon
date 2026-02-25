create extension if not exists pgcrypto;

create table if not exists public.actors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  hero_image text,
  bio text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  release_date date not null,
  decade integer not null,
  genres text[] not null default '{}',
  poster_url text,
  imdb_id text unique,
  tmdb_id bigint unique,
  synopsis text,
  runtime_minutes integer,
  imdb_rating numeric(3,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.actor_movies (
  actor_id uuid not null references public.actors(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  curated_rank integer not null default 999,
  created_at timestamptz not null default now(),
  primary key (actor_id, movie_id)
);

create table if not exists public.owner_ratings (
  actor_id uuid not null references public.actors(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  score numeric(3,1) not null check (score >= 1 and score <= 10),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, movie_id)
);

create table if not exists public.guest_votes (
  movie_id uuid not null references public.movies(id) on delete cascade,
  guest_key_hash text not null,
  ip_hash text not null,
  score numeric(3,1) not null check (score >= 1 and score <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (movie_id, guest_key_hash)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  display_name text not null,
  body text not null,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  delete_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reason text not null,
  reporter_key_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.actors(id) on delete set null,
  status text not null check (status in ('running', 'success', 'failed')),
  details jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.api_rate_limits (
  key_hash text not null,
  scope text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key_hash, scope, window_start)
);

create or replace view public.movie_rating_stats as
select
  m.id as movie_id,
  coalesce(round(avg(g.score)::numeric, 1), 0.0)::numeric(3,1) as community_avg,
  count(g.score)::integer as community_count
from public.movies m
left join public.guest_votes g on g.movie_id = m.id
group by m.id;

alter table public.actors enable row level security;
alter table public.movies enable row level security;
alter table public.actor_movies enable row level security;
alter table public.owner_ratings enable row level security;
alter table public.guest_votes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
alter table public.sync_runs enable row level security;
alter table public.api_rate_limits enable row level security;

create policy "public can read actors"
  on public.actors for select
  using (true);

create policy "public can read movies"
  on public.movies for select
  using (true);

create policy "public can read actor_movies"
  on public.actor_movies for select
  using (true);

create policy "public can read owner_ratings"
  on public.owner_ratings for select
  using (true);

create policy "public can read visible comments"
  on public.comments for select
  using (status = 'visible');

create policy "service manages comments"
  on public.comments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages votes"
  on public.guest_votes for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages reports"
  on public.comment_reports for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages sync"
  on public.sync_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages limits"
  on public.api_rate_limits for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages curated"
  on public.actors for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages movies"
  on public.movies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages actor_movies"
  on public.actor_movies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages owner_ratings"
  on public.owner_ratings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
