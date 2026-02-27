create table if not exists public.user_watchlist (
  user_id uuid not null references public.app_users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists idx_user_watchlist_user_id_created_at
  on public.user_watchlist(user_id, created_at desc);

create index if not exists idx_user_watchlist_movie_id
  on public.user_watchlist(movie_id);

alter table public.user_watchlist enable row level security;

create policy "service manages user watchlist"
  on public.user_watchlist for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
