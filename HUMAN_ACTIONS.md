# Remaining Human Actions

## No blocking setup actions remain for local MVP

Machine steps are complete:
- migration run
- seed run
- sync run (`tom-hanks`)
- functional API verification pass

## Optional Next Human Actions

1. Visual QA in browser (`http://localhost:3000`) for final sign-off.
2. Set `HCAPTCHA_BYPASS=false` before production.
3. Deploy and configure a daily cron call to `/api/cron/daily-sync` with header `x-cron-secret`.
