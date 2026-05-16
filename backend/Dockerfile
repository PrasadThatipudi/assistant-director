# syntax=docker/dockerfile:1
# Build from repository root: docker build -f backend/Dockerfile .

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN groupadd --gid 1000 app && useradd --uid 1000 --gid app --shell /usr/sbin/nologin --create-home app

WORKDIR /build

COPY backend/pyproject.toml backend/README.md backend/alembic.ini /build/backend/
COPY backend/src /build/backend/src
COPY backend/alembic /build/backend/alembic

WORKDIR /build/backend

RUN pip install --upgrade pip && pip install --no-cache-dir .

RUN chown -R app:app /build/backend

USER app

WORKDIR /build/backend

EXPOSE 8000

ENV DATABASE_URL=postgresql+psycopg://assistant:assistant@localhost:5432/assistant_director \
    CORS_ALLOW_ORIGINS=http://localhost:8081

# Render sets PORT; default 8000 for local docker compose.
CMD ["sh", "-c", "exec uvicorn assistant_director_api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
