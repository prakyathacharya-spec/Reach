# ReachInbox Scheduler — Backend

## Setup

```bash
cp .env.example .env
docker compose up -d          # postgres, redis, elasticsearch
npm install
npm run prisma:migrate
npm run dev                   # API on :4000
npm run worker                # in a second terminal — BullMQ worker
```

Queue dashboard: http://localhost:4000/admin/queues

### Setting up Ethereal
Create a `Sender` row per test identity using a one-off script/REPL call to
`nodemailer.createTestAccount()` and store the returned `user`/`pass` on the
`Sender` record. This lets the system support multiple senders, each with
independent rate-limit counters.

### Google / Slack OAuth
Create credentials in the Google Cloud Console and a Slack app (with the
`incoming-webhook` + `chat:write` scopes and Redirect URL set to
`SLACK_REDIRECT_URI`), then fill in the client id/secret in `.env`.

## Architecture

**Scheduling (no cron):** `POST /api/schedule` creates one `Email` row per
CSV recipient with a computed `scheduledAt`, then adds a BullMQ **delayed
job** per row via `emailQueue.add(..., { jobId: email.id, delay })`. Using
the email's own id as the BullMQ job id is the idempotency mechanism — BullMQ
rejects a duplicate `add()` for a job id that's already active, and the
worker also checks `status === "sent"` before doing anything, so a request
retried by the client, or a crash-recovery reconciliation pass, can never
double-send.

**Persistence across restarts:** Redis is run with AOF persistence
(`docker-compose.yml`), so BullMQ's delayed jobs survive a container
restart on their own. On top of that, `emailWorker.ts` runs a
`reconcileOnBoot()` pass on startup that finds any `pending`/`scheduled`
email rows with no corresponding live BullMQ job (the only way this can
happen is if Redis data itself were lost) and re-enqueues them from Postgres,
which is the durable source of truth.

**Concurrency & throttling:** the Worker is created with a configurable
`concurrency` (`WORKER_CONCURRENCY`) and a BullMQ `limiter` of `{ max: 1,
duration: DEFAULT_MIN_DELAY_MS }`, enforcing a minimum delay between
individual sends (default 2s) to mimic provider throttling.

**Per-sender hourly rate limiting:** `lib/rateLimiter.ts` keeps a Redis
counter keyed by `sender + current UTC hour`, incremented atomically so it's
safe across multiple worker processes. Limits are read from
`Campaign.hourlyLimit` (configurable per schedule request, no hardcoding).
When a sender is at its limit, the worker does **not** fail the job — it
marks the email `scheduled` for the start of the next hour window and
enqueues a new delayed job for it, preserving per-recipient order within
each sender.

**Slack on rate-limit hit:** `lib/slack.ts` posts to the user's stored
incoming-webhook URL the moment `tryReserveSendSlot` returns false. If the
user has never connected Slack (no `SlackIntegration` row), this is a silent
no-op; connecting later starts sending notifications immediately with no
redeploy, since the lookup happens per-job.

**Search:** every create/update to an `Email` row is written through to
Elasticsearch (`lib/searchIndex.ts`); `/api/emails/search` queries ES
directly rather than Postgres.

**Live queue visibility:** `@bull-board/express` is mounted at
`/admin/queues`.

## Features implemented (backend)
- [x] Scheduling via BullMQ delayed jobs, no cron
- [x] Persistence across restarts (AOF + boot-time reconciliation)
- [x] Idempotent sends (jobId = email.id + DB status check)
- [x] Configurable worker concurrency
- [x] Minimum delay between sends
- [x] Per-sender hourly rate limit, Redis-backed, config-driven
- [x] Reschedule-not-drop behavior when rate limit is hit
- [x] Live Slack notification on rate-limit hit, with connect/disconnect handling
- [x] Elasticsearch indexing + search endpoint
- [x] Live BullMQ dashboard
- [x] Google OAuth login, session cookie
- [x] Slack OAuth connect flow

## Assumptions / trade-offs
- Auth is a minimal cookie-session rather than full JWT rotation — sufficient
  for the assignment's scope.
- `userId`/`senderId` are passed in the schedule request body rather than
  derived purely from session middleware, to keep the API testable via
  Postman without a full frontend session; swap in an auth middleware for
  production.
- Rate limiting uses fixed hour buckets (not a sliding window) — simpler and
  meets the "reset every hour" requirement; a sliding window would smooth
  bursts at hour boundaries but wasn't required.
