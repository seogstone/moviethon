# Index Ops Runbook

## Core Local Commands
- Seed curated data: `npm run seed`
- Seed dummy users/ratings/comments: `npm run seed:dummy-community`
- Run one index day: `npm run index:run -- 2026-02-28`
- Backfill index history: `npm run index:backfill -- 45`
- Check index health/anomalies: `npm run index:health`
- Full demo setup: `npm run seed:v2-demo`

## API Health Checks (admin token required)
- `GET /api/admin/index/health`
- `GET /api/admin/index/anomalies?limit=30`

Header required:
- `x-admin-token: <ADMIN_API_TOKEN>`

## Staleness SLO
- Target: daily index run should finish within 24h cadence.
- Current stale threshold: 36h since last finished run.

## Failure Triage
1. Check latest cron result in deployment logs.
2. Check `/api/admin/index/health` for latest run error payload.
3. Re-run pipeline locally: `npm run index:run`.
4. If schema mismatch suspected, verify latest migration is applied.

## Common Failure Modes
- Missing migration tables (`film_index_history`, `index_runs`, etc.).
- Missing/invalid service role credentials.
- Upstream sync failures propagating into cron execution.

## Recovery
1. Apply missing migrations.
2. Rerun backfill for desired window: `npm run index:backfill -- 45`.
3. Recheck anomalies and health outputs.
