create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth0_sub text not null unique,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_votes (
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  score numeric(3,1) not null check (score >= 1 and score <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (movie_id, user_id)
);

alter table public.comments
  add column if not exists user_id uuid references public.app_users(id) on delete set null;

create index if not exists idx_user_votes_movie_id on public.user_votes(movie_id);
create index if not exists idx_user_votes_user_id on public.user_votes(user_id);
create index if not exists idx_comments_user_id_created_at on public.comments(user_id, created_at desc);

alter table public.app_users enable row level security;
alter table public.user_votes enable row level security;

create policy "service manages app users"
  on public.app_users for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service manages user votes"
  on public.user_votes for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
