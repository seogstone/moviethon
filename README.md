# Moviethon v1

Tom Hanks first, multi-actor ready.

## Stack

- Next.js (App Router, TypeScript)
- Supabase (Postgres + RLS)
- TMDb + OMDb sync pipeline
- hCaptcha on rating/comment writes

## Routes

- `/` featured actor discovery (Tom Hanks seeded)
- `/actors/[actorSlug]` actor movie grid (chronological, filters, sorts)
- `/actors/[actorSlug]/movies/[movieSlug]` movie detail + community panel
- `/rankings/films`
- `/rankings/actors`
- `/rankings/genres`
- `/rankings/gainers`
- `/rankings/decliners`

## API Endpoints

- `GET /api/actors`
- `GET /api/actors/:actorSlug/movies`
- `GET /api/movies/:movieId`
- `POST /api/movies/:movieId/rate`
- `GET /api/movies/:movieId/comments`
- `POST /api/movies/:movieId/comments`
- `GET /api/me`
- `GET /api/me/ratings`
- `POST /api/comments/:commentId/report`
- `POST /api/comments/:commentId/delete`
- `POST /api/admin/sync/actor/:actorSlug` (admin token required)
- `POST /api/admin/comments/:commentId/hide` (admin token required)
- `GET /api/admin/index/health` (admin token required)
- `GET /api/admin/index/anomalies` (admin token required)
- `GET|POST /api/cron/daily-sync` (cron secret required)
- `GET /api/index/methodology`
- `GET /api/rankings/films`
- `GET /api/rankings/actors`
- `GET /api/rankings/genres`
- `GET /api/rankings/movers`
- `GET /api/indices/movies/:movieId/history`
- `GET /api/indices/actors/:actorId/history`

## Local Setup

1. Install dependencies:
   - `npm install --cache .npm-cache`
2. Create env file:
   - `cp .env.example .env.local`
3. Fill Supabase + API keys in `.env.local`.
4. Run migration in Supabase SQL editor:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_auth0_accounts.sql`
   - `supabase/migrations/0003_user_profiles.sql`
   - `supabase/migrations/0004_watchlist.sql`
   - `supabase/migrations/0005_index_intelligence.sql`
5. Seed data:
   - `npm run seed`
   - `npm run seed:dummy-community`
   - `npm run index:backfill -- 45`
6. Start dev server:
   - `npm run dev`

### Demo Bootstrap

- One-shot local demo bootstrap:
  - `npm run seed:v2-demo`

## Auth0 Setup

1. Install/set the Auth0 env values in `.env.local`:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_SECRET`
   - `APP_BASE_URL`
2. In Auth0 application settings, add:
   - Allowed Callback URLs: `<APP_BASE_URL>/auth/callback`
   - Allowed Logout URLs: `<APP_BASE_URL>`
3. App login/logout/profile routes are mounted by Auth0 middleware:
   - `/auth/login`
   - `/auth/logout`
   - `/auth/profile`

## Sync Operations

- Manual actor sync:
  - `npm run sync:actor -- tom-hanks`
- Admin API sync:
  - `POST /api/admin/sync/actor/tom-hanks` with header `x-admin-token`
- Daily sync cron:
  - `GET /api/cron/daily-sync` with header `authorization: Bearer <CRON_SECRET>` (Vercel Cron, runs index pipeline only)
  - `POST /api/cron/daily-sync` with header `x-cron-secret` (manual trigger, index pipeline only)
  - `POST /api/cron/daily-sync?mode=full-sync&actorLimit=2` (manual featured-actor metadata sync + index; use small batches to avoid timeouts)

## Community / Moderation Flow

- Logged-in users rate movies (1-10), one active vote per user+movie (upsert behavior).
- Logged-in users post comments under profile display name.
- API protections: captcha verification, rate limits, IP/fingerprint guardrails, basic blocked-language check.
- Comments can be:
  - Reported by users
  - Hidden by admin endpoint
  - Deleted by original author with one-time token returned after posting.

## Testing

- Run all tests:
  - `npm run test:run`

Coverage focus:

- Rating math and vote-upsert semantics
- Filter/sort behavior
- Captcha bypass behavior for local dev
- Rate limiting behavior
- Delete token verification
- TMDb/OMDb merge logic
- Index component computation and aggregate volatility logic

## Notes

- The app supports fallback seeded data in UI if Supabase env is missing.
- For production, disable `HCAPTCHA_BYPASS` and provide real captcha/site keys.
- Community scores use `user_votes` as the primary source.
- Legacy guest vote inclusion can be toggled with `INCLUDE_LEGACY_GUEST_VOTES=true|false`.
- Logged-in users can manage profile fields at `/me` (display name + bio).
- Index operational runbook is in `docs/index-ops.md`.
