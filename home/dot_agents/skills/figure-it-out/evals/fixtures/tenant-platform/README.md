# tenant-platform

One process hosts the API gateway and the three workers that consume its jobs.

- `gateway/server.ts` accepts `POST /v1/jobs/<kind>` with an `x-tenant-id` header and publishes the job.
- `workers/ingest.ts`, `workers/pricing.ts`, `workers/notify.ts` consume jobs of their kind.
- `shared/redis.ts` is the client for the shared Redis store (`REDIS_URL`, default `redis://127.0.0.1:6379`).
- `shared/queue.ts` is the in-process job bus.

Run: `npm start`. Test: `npm test`. No dependencies to install.
