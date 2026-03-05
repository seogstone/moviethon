-- Canonical movie routes resolve actors from movie_id frequently.
-- Add supporting indexes so /movies/:slug lookups stay fast as data grows.
create index if not exists idx_actor_movies_movie_id_curated_rank
  on public.actor_movies (movie_id, curated_rank, actor_id);

create index if not exists idx_owner_ratings_movie_id
  on public.owner_ratings (movie_id);

create index if not exists idx_actor_movie_role_weights_movie_id
  on public.actor_movie_role_weights (movie_id);
