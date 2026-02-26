alter table public.app_users
  add column if not exists display_name text,
  add column if not exists bio text;

create index if not exists idx_app_users_display_name on public.app_users(display_name);
