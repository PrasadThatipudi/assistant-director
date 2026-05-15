"""Shared pytest configuration: test DB URL before app imports, schema, truncation."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

# Local default: Docker Postgres mapped to host 5433 (see docker-compose.yml).
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://assistant:assistant@127.0.0.1:5433/assistant_director",
)

from assistant_director_api.config import get_settings
from assistant_director_api.db.session import reset_engine_for_tests

get_settings.cache_clear()
reset_engine_for_tests()


@pytest.fixture(scope="session")
def db_schema_ready() -> None:
    """Apply Alembic migrations once per test session."""
    from sqlalchemy import create_engine, text

    from assistant_director_api.config import get_settings

    url = get_settings().database_url
    probe = create_engine(url, pool_pre_ping=True)
    try:
        with probe.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OSError:
        pytest.skip("PostgreSQL not reachable (set DATABASE_URL; start `docker compose up -d`).")
    except Exception:
        pytest.skip("PostgreSQL not reachable (set DATABASE_URL; start `docker compose up -d`).")
    finally:
        probe.dispose()

    backend_root = Path(__file__).resolve().parent.parent
    env = os.environ.copy()
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(backend_root),
        check=True,
        env=env,
    )
    yield


@pytest.fixture
def db_clean(db_schema_ready: None) -> None:
    """Remove all rows between tests (FK-safe order)."""
    from sqlalchemy import text

    from assistant_director_api.db.session import get_engine

    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE scenes, projects, users CASCADE"))
    yield


@pytest.fixture
def api_client(db_clean: None):
    """HTTP client against the FastAPI app with a clean database."""
    from fastapi.testclient import TestClient

    from assistant_director_api.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture
def registered_user(api_client):
    """POST /v1/users and return (client, bearer_headers, user_id_str)."""
    import uuid

    email = f"it-{uuid.uuid4().hex[:12]}@test.invalid"
    res = api_client.post("/v1/users", json={"email": email})
    assert res.status_code == 201, res.text
    user_id = res.json()["id"]
    headers = {"Authorization": f"Bearer {user_id}"}
    return api_client, headers, user_id
