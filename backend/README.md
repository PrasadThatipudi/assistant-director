# Assistant Director API

FastAPI service backed by PostgreSQL. Script binaries are stored on the local filesystem under `BLOB_STORAGE_PATH` (S3-compatible storage can replace this later without changing the API contract).

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
| `BLOB_STORAGE_PATH` | Directory for uploaded script blobs (created automatically). |
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
- `POST /v1/projects/{id}/scripts` — multipart script upload.
- `GET /v1/script-artifacts/{artifact_id}/file` — download bytes for a script the user owns.

## Common issues

- **`FATAL: role "assistant" does not exist` on port 5432** — another Postgres instance is bound to 5432. This repo maps Docker Postgres to **5433**; ensure `DATABASE_URL` uses that port.
- **Alembic cannot import the app** — run commands from `backend/` with `pip install -e .` so `assistant_director_api` is on `PYTHONPATH`.
