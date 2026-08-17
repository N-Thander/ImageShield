# ImageShield

A Pinterest-scale image-moderation pipeline: FastAPI API + async workers, backed by
Redis, Postgres/pgvector and MinIO.

> **Status: phase 0 — environment only.** The stack comes up and every backing
> service is reachable. Model inference and the real moderation cascade are
> stubbed with `TODO(phase-1)` markers.

---

## Dev environment

### Prerequisites

Docker with Compose v2 (`docker compose version` ≥ 2.20 — the stack relies on
`depends_on: condition: service_completed_successfully`). Nothing else is
installed on the host: Postgres, pgvector, Redis and MinIO all run as containers.

### Configuration

All configuration is environment-driven, read in `app/config.py`. Copy the
committed example once:

```bash
cp .env.example .env      # `make up` does this for you if .env is missing
```

`.env` is gitignored and must never be committed. The only variable that differs
between the two dev modes is the host set — `POSTGRES_HOST`/`REDIS_HOST`/
`MINIO_ENDPOINT` point at Compose service names inside Docker and at `localhost`
when you run the app natively.

**Port conflicts.** The `*_PUBLISHED_PORT` vars control only what Docker exposes
on your machine; containers always reach each other on the standard internal
ports. If you already run something on one of these — a natively installed
Postgres on 5432 is the usual culprit — change it in your local `.env`:

```dotenv
POSTGRES_PUBLISHED_PORT=5433
```

Then connect natively with `psql -h localhost -p 5433`. Note that the Makefile
passes `--env-file .env` for exactly this reason: Compose interpolates `${VAR}`
against the compose file's own directory (`infra/`), so without it the root
`.env` would be invisible to these vars and they would silently keep their
defaults.

### Mode 1 — full stack in Docker

Everything, including the API and worker, runs in containers:

```bash
make up          # builds the app image, then: infra -> init -> api + worker
```

This runs attached and streams logs; `Ctrl-C` stops it. For a detached run use
`docker compose -f infra/docker-compose.yml --profile app up --build -d` and
then `make logs`.

Ordering is enforced by Compose, not by shell wait-loops: `postgres`, `redis`
and `minio` must report healthy, then the one-shot `init` container applies the
schema and creates the bucket and must **exit 0**, and only then do `api` and
`worker` start.

Verify:

```bash
curl -s http://localhost:8000/health          # or: make health
```

```json
{"status": "ok", "postgres": true, "redis": true, "minio": true}
```

### Mode 2 — infra in Docker, app natively

Useful when you want a debugger, a fast edit loop, or a GPU torch build.

```bash
make infra                                # redis + postgres + minio only

# point the app at localhost instead of the Compose service names
export $(grep -v '^#' .env | sed 's/#.*//' | xargs)
export POSTGRES_HOST=localhost REDIS_HOST=localhost MINIO_ENDPOINT=localhost:9000

python -m app.migrate                      # apply schema
python -m app.init_storage                 # ensure bucket
uvicorn app.main:app --reload --port 8000  # terminal 1
python -m workers.consumer                 # terminal 2
```

### Make targets

| target | what it does |
| --- | --- |
| `make infra` | backing services only, detached |
| `make up` | full stack, builds the app image |
| `make init` | re-run migrations + bucket bootstrap |
| `make logs` | tail `api` and `worker` |
| `make health` | pretty-print `/health` |
| `make down` | stop everything, **keep** volumes |
| `make nuke` | stop everything and **delete** volumes (full reset) |

`make nuke && make up` rebuilds from zero — the schema and bucket bootstrap are
idempotent, so this is the clean-machine reproduction path.

### Service endpoints

| service | address | notes |
| --- | --- | --- |
| API | http://localhost:8000 | docs at `/docs` |
| Postgres | `localhost:5432` | `pgvector/pgvector:pg16`; see port conflicts above |
| Redis | `localhost:6379` | |
| MinIO S3 | `localhost:9000` | |
| MinIO console | http://localhost:9001 | login from `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |

### API surface (phase 0)

`GET /health` — genuinely pings all three services. Returns `200` when all are
up, `503` with the same per-service booleans when any is down.

`POST /moderate` — **stub**. Records a `PENDING` row and returns it, which
proves the API→Postgres write path. No inference yet.

```bash
curl -s -X POST http://localhost:8000/moderate \
  -H 'content-type: application/json' \
  -d '{"image_url": "https://example.com/cat.jpg"}'
```

### Layout

```
app/       FastAPI app, config, storage helpers, migrate/init_storage bootstrap
workers/   async consumer (stub loop in phase 0)
common/    shared hashing / phash / event helpers
ingest/    batch ingestion entrypoints
infra/     docker-compose.yml + schema.sql
docker/    Dockerfile + entrypoint (api and worker share one image)
frontend/  Next.js UI (not part of the Python image or the compose stack)
```

### Phase-1 stubs

Everything below is intentionally unimplemented and marked `TODO(phase-1)`:

- `app/models.py` — lazy model loader is wired, but `score_image()` raises.
- `app/cascade.py` — decision vocabulary and thresholds only; `decide()` raises.
- `app/main.py` — `/moderate` hashes the URL rather than image bytes and never
  enqueues; no download, phash, MinIO put, or cascade.
- `workers/consumer.py` — connects to Redis and heartbeats; consumes nothing.
