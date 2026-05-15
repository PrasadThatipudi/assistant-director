# Assistant Director API

FastAPI service backed by PostgreSQL. **Screenplay files stay on devices only** — the API does not store script bytes.

## Prerequisites

- Python 3.11 or newer (3.14 used in development is supported).
- Docker Desktop or compatible engine (for PostgreSQL).
- `pip` available in your environment.

## Configuration

Copy the example environment file and adjust if needed:

```bash
cd backend
cp .env.example .env
```

Important variables:

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | SQLAlchemy URL. Default points at Docker Postgres on host port **5433** (avoids clashing with a local Postgres on 5432). |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed web origins for Expo web and dev tools. |

## Database (Docker + Alembic)

Start PostgreSQL from the repository root:

```bash
docker compose up -d
```

Run migrations (from `backend/` with the virtual environment active):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
```

## Run the API

```bash
cd backend
source .venv/bin/activate
uvicorn assistant_director_api.main:app --reload --host 0.0.0.0 --port 8000
```

Smoke checks:

```bash
curl -sS http://127.0.0.1:8000/health
curl -sS -X POST http://127.0.0.1:8000/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
```

The `POST /v1/users` response includes `id`. The mobile client uses `Authorization: Bearer <id>` for development (replace with proper JWT-based auth in production).

## HTTP surface (summary)

- `GET /health` — liveness.
- `POST /v1/users` — register a user (dev-oriented; tighten for production).
- `GET /v1/me` — current user from bearer token.
- `GET|POST|PATCH /v1/projects` — project CRUD for the authenticated user.
- `GET|POST|PATCH|DELETE /v1/projects/{id}/scenes` — scene CRUD.
- `POST /v1/sync/push` — batch outbox sync with last-write-wins semantics on `updated_at`.

## Dev testing: clear all projects

From the repository root, delete every row in `projects` (cascades to `scenes`; does not remove `users`):

```bash
npm run backend:clear-projects
```

## Common issues

- **`FATAL: role "assistant" does not exist` on port 5432** — another Postgres instance is bound to 5432. This repo maps Docker Postgres to **5433**; ensure `DATABASE_URL` uses that port.
- **Alembic cannot import the app** — run commands from `backend/` with `pip install -e .` so `assistant_director_api` is on `PYTHONPATH`.

## Docker image

Build from the **repository root**:

```bash
docker build -f backend/Dockerfile -t assistant-director-api:local .
```

Run (example; set `DATABASE_URL` to a reachable Postgres):

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql+psycopg://assistant:assistant@host.docker.internal:5433/assistant_director \
  -e CORS_ALLOW_ORIGINS=http://localhost:8081 \
  assistant-director-api:local
```

CI pushes `ghcr.io/<github-owner-lowercase>/assistant-director-api` on pushes to `main` (see root README **CI/CD and deployment**).
