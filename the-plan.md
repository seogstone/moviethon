# Moviethon Execution Plan (Accountability)

## Goal
Build Moviethon into a governed, auditable film momentum intelligence platform where historical index data powers rankings and product UX.

## Delivery Order
1. [x] Index governance + formula versioning foundations
2. [x] Time-series schema and event logging backbone
3. [x] Daily film/actor/genre index computation pipeline
4. [x] Cron orchestration with index-run observability
5. [x] Public index APIs + rankings routes/pages
6. [x] Homepage market-overview-first pivot
7. [x] Actor/movie page index intelligence blocks
8. [ ] Anti-gaming confidence thresholds and anomaly scoring pass
9. [ ] Production observability dashboards + alerting runbooks
10. [ ] Blog workstream after stable index v1

## Completed In This Iteration
- Added index schema + history/event tables + RLS/service-role policies.
- Added governed `INDEX_V1` defaults and formula metadata table.
- Implemented daily index compute modules for:
  - film index (component-level scores)
  - actor index (weighted by role and recency decay)
  - genre index (macro aggregate)
- Extended daily cron flow to run index pipeline after external sync.
- Added ranking APIs:
  - `/api/rankings/films`
  - `/api/rankings/actors`
  - `/api/rankings/genres`
  - `/api/rankings/movers`
- Added index history APIs:
  - `/api/indices/movies/:movieId/history`
  - `/api/indices/actors/:actorId/history`
- Added methodology endpoint:
  - `/api/index/methodology`
- Added ranking pages:
  - `/rankings/films`
  - `/rankings/actors`
  - `/rankings/genres`
  - `/rankings/gainers`
  - `/rankings/decliners`
- Redesigned homepage to lead with market overview blocks and rank navigation.
- Added index cards/trend context to actor and movie pages.
- Added vote/comment event logging hooks on write flows for auditability.

## Next Highest-Value Work
1. Add confidence gates for low-sample gainers/decliners and manipulation-resistant scoring.
2. Add stale-index monitoring/alerts and index-run health dashboard.
3. Add admin review tooling for anomalous movement diagnostics.
4. Add public methodology page in UI (not just API) with version changelog.
5. Start weekly market-wrap content loop after index stability validation.
