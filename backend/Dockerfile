# syntax=docker/dockerfile:1

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN groupadd --gid 1000 app && useradd --uid 1000 --gid app --shell /usr/sbin/nologin --create-home app

WORKDIR /app

COPY pyproject.toml README.md alembic.ini ./
COPY src ./src
COPY alembic ./alembic

RUN pip install --upgrade pip && pip install --no-cache-dir .

RUN mkdir -p /data/blobs && chown -R app:app /app /data

USER app

EXPOSE 8000

# Override at runtime (see backend README deploy section).
ENV DATABASE_URL=postgresql+psycopg://assistant:assistant@localhost:5432/assistant_director \
    BLOB_STORAGE_PATH=/data/blobs \
    CORS_ALLOW_ORIGINS=http://localhost:8081

CMD ["uvicorn", "assistant_director_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
