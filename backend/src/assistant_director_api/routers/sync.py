import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from assistant_director_api.db import models
from assistant_director_api.db.session import get_db
from assistant_director_api.deps import get_current_user, utcnow
from assistant_director_api.schemas import (
    SyncOperation,
    SyncOperationResult,
    SyncPushRequest,
    SyncPushResponse,
)

router = APIRouter(prefix="/sync", tags=["sync"])


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return None


@router.post("/push", response_model=SyncPushResponse)
def push_sync(
    body: SyncPushRequest,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SyncPushResponse:
    results: list[SyncOperationResult] = []
    for op in body.operations:
        if op.entity_type == "project":
            results.append(_apply_project_op(db, current, op))
        elif op.entity_type == "scene":
            results.append(_apply_scene_op(db, current, op))
    db.commit()
    return SyncPushResponse(results=results)


def _apply_project_op(db: Session, current: models.User, op: SyncOperation) -> SyncOperationResult:
    project = db.get(models.Project, op.entity_id)
    if op.op == "delete":
        if project is None or project.owner_id != current.id:
            return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")
        project.is_archived = True
        project.archived_at = utcnow()
        project.updated_at = utcnow()
        project.version = project.version + 1
        db.add(project)
        return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")

    if op.op != "upsert":
        return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Unsupported op")

    payload = op.payload or {}
    if project is not None and project.owner_id != current.id:
        return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Forbidden")

    if project is not None and project.updated_at > op.client_updated_at:
        return SyncOperationResult(
            client_op_id=op.client_op_id,
            status="conflict",
            detail="Server has newer updated_at",
            server_payload=_project_to_dict(project),
        )

    now = utcnow()
    if project is None:
        title = str(payload.get("title", "")).strip()
        if len(title) < 1:
            return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Missing title")
        project = models.Project(
            id=op.entity_id,
            owner_id=current.id,
            title=title[:120],
            description=str(payload.get("description", ""))[:2000],
            is_archived=bool(payload.get("is_archived", False)),
            archived_at=_parse_dt(payload.get("archived_at")),
            created_at=now,
            updated_at=now,
            version=1,
        )
        db.add(project)
        return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")

    if "title" in payload:
        project.title = str(payload["title"]).strip()[:120]
    if "description" in payload:
        project.description = str(payload["description"])[:2000]
    if "is_archived" in payload:
        project.is_archived = bool(payload["is_archived"])
    if "archived_at" in payload:
        project.archived_at = _parse_dt(payload.get("archived_at"))
    project.updated_at = now
    project.version = project.version + 1
    db.add(project)
    return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")


def _apply_scene_op(db: Session, current: models.User, op: SyncOperation) -> SyncOperationResult:
    scene = db.get(models.Scene, op.entity_id)
    project_id_hint = None
    if op.payload and "project_id" in op.payload:
        try:
            project_id_hint = uuid.UUID(str(op.payload["project_id"]))
        except ValueError:
            return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Invalid project_id")

    if scene is not None:
        project_id_hint = scene.project_id

    if project_id_hint is None:
        return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Missing project_id")

    project = db.get(models.Project, project_id_hint)
    if project is None or project.owner_id != current.id:
        return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Project not found")

    if op.op == "delete":
        if scene is None:
            return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")
        db.delete(scene)
        project.updated_at = utcnow()
        project.version = project.version + 1
        db.add(project)
        return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")

    if op.op != "upsert":
        return SyncOperationResult(client_op_id=op.client_op_id, status="rejected", detail="Unsupported op")

    if scene is not None and scene.updated_at > op.client_updated_at:
        return SyncOperationResult(
            client_op_id=op.client_op_id,
            status="conflict",
            detail="Server has newer updated_at",
            server_payload=_scene_to_dict(scene),
        )

    now = utcnow()
    payload = op.payload or {}
    body = dict(payload.get("body", {}))
    sort_index = int(payload.get("sort_index", 0))

    if scene is None:
        scene = models.Scene(
            id=op.entity_id,
            project_id=project_id_hint,
            sort_index=sort_index,
            body=body,
            created_at=now,
            updated_at=now,
            version=1,
        )
        db.add(scene)
    else:
        scene.sort_index = sort_index
        scene.body = body
        scene.updated_at = now
        scene.version = scene.version + 1
        db.add(scene)

    project.updated_at = now
    project.version = project.version + 1
    db.add(project)
    return SyncOperationResult(client_op_id=op.client_op_id, status="accepted")


def _project_to_dict(project: models.Project) -> dict[str, Any]:
    return {
        "id": str(project.id),
        "title": project.title,
        "description": project.description,
        "is_archived": project.is_archived,
        "archived_at": project.archived_at.isoformat() if project.archived_at else None,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "version": project.version,
    }


def _scene_to_dict(scene: models.Scene) -> dict[str, Any]:
    return {
        "id": str(scene.id),
        "project_id": str(scene.project_id),
        "sort_index": scene.sort_index,
        "body": scene.body,
        "created_at": scene.created_at.isoformat(),
        "updated_at": scene.updated_at.isoformat(),
        "version": scene.version,
    }
