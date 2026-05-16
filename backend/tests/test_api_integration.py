"""API integration tests (Postgres + Alembic + TestClient)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi.testclient import TestClient


def test_health(api_client: TestClient) -> None:
    res = api_client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_register_user(api_client: TestClient) -> None:
    email = f"reg-{uuid.uuid4().hex[:10]}@test.invalid"
    res = api_client.post("/v1/users", json={"email": email})
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["email"] == email


def test_register_duplicate_email_returns_409(api_client: TestClient) -> None:
    email = f"dup-{uuid.uuid4().hex[:10]}@test.invalid"
    assert api_client.post("/v1/users", json={"email": email}).status_code == 201
    res = api_client.post("/v1/users", json={"email": email})
    assert res.status_code == 409


def test_me_requires_auth(api_client: TestClient) -> None:
    res = api_client.get("/v1/users/me")
    assert res.status_code == 401


def test_me_with_valid_bearer(registered_user) -> None:
    client, headers, user_id = registered_user
    res = client.get("/v1/users/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == user_id


def test_create_project(registered_user) -> None:
    client, headers, _user_id = registered_user
    res = client.post(
        "/v1/projects",
        json={"title": "Integration Project", "description": "d1"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["title"] == "Integration Project"
    assert data["description"] == "d1"
    assert data["version"] == 1


def test_create_project_with_client_id_conflict(registered_user) -> None:
    client, headers, _user_id = registered_user
    pid = str(uuid.uuid4())
    r1 = client.post(
        "/v1/projects",
        json={"id": pid, "title": "First", "description": ""},
        headers=headers,
    )
    assert r1.status_code == 201
    r2 = client.post(
        "/v1/projects",
        json={"id": pid, "title": "Second", "description": ""},
        headers=headers,
    )
    assert r2.status_code == 409


def test_sync_push_project_upsert(registered_user) -> None:
    client, headers, _user_id = registered_user
    project_id = str(uuid.uuid4())
    ts = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc).isoformat()
    body = {
        "operations": [
            {
                "client_op_id": "c1",
                "entity_type": "project",
                "entity_id": project_id,
                "op": "upsert",
                "payload": {"title": "Synced Title", "description": "from device"},
                "client_updated_at": ts,
            }
        ]
    }
    res = client.post("/v1/sync/push", json=body, headers=headers)
    assert res.status_code == 200, res.text
    out = res.json()
    assert len(out["results"]) == 1
    assert out["results"][0]["status"] == "accepted"
    assert out["results"][0]["client_op_id"] == "c1"

    listed = client.get("/v1/projects", headers=headers)
    assert listed.status_code == 200
    projects = listed.json()
    ids = {p["id"] for p in projects}
    assert project_id in ids
    match = next(p for p in projects if p["id"] == project_id)
    assert match["title"] == "Synced Title"
