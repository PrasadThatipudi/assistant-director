import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from assistant_director_api.db import models
from assistant_director_api.db.session import get_db
from assistant_director_api.deps import get_current_user, utcnow
from assistant_director_api.routers.projects import _get_owned_project
from assistant_director_api.schemas import SceneCreate, ScenePatch, SceneResponse

router = APIRouter(prefix="/projects/{project_id}/scenes", tags=["scenes"])


@router.get("", response_model=list[SceneResponse])
def list_scenes(
    project_id: uuid.UUID,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[models.Scene]:
    _get_owned_project(db, current.id, project_id)
    stmt = (
        select(models.Scene)
        .where(models.Scene.project_id == project_id)
        .order_by(models.Scene.sort_index.asc(), models.Scene.created_at.asc())
    )
    return list(db.scalars(stmt))


@router.post("", response_model=SceneResponse, status_code=201)
def create_scene(
    project_id: uuid.UUID,
    payload: SceneCreate,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Scene:
    _get_owned_project(db, current.id, project_id)
    scene_id = payload.id or uuid.uuid4()
    if db.get(models.Scene, scene_id) is not None:
        raise HTTPException(status_code=409, detail="Scene id already exists")
    now = utcnow()
    scene = models.Scene(
        id=scene_id,
        project_id=project_id,
        sort_index=payload.sort_index,
        body=dict(payload.body),
        created_at=now,
        updated_at=now,
        version=1,
    )
    db.add(scene)
    parent = db.get(models.Project, project_id)
    if parent is not None:
        parent.updated_at = now
        parent.version = parent.version + 1
        db.add(parent)
    db.commit()
    db.refresh(scene)
    return scene


@router.patch("/{scene_id}", response_model=SceneResponse)
def patch_scene(
    project_id: uuid.UUID,
    scene_id: uuid.UUID,
    payload: ScenePatch,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Scene:
    _get_owned_project(db, current.id, project_id)
    scene = db.get(models.Scene, scene_id)
    if scene is None or scene.project_id != project_id:
        raise HTTPException(status_code=404, detail="Scene not found")
    if payload.sort_index is not None:
        scene.sort_index = payload.sort_index
    if payload.body is not None:
        scene.body = dict(payload.body)
    now = utcnow()
    scene.updated_at = now
    scene.version = scene.version + 1
    parent = db.get(models.Project, project_id)
    if parent is not None:
        parent.updated_at = now
        parent.version = parent.version + 1
        db.add(parent)
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return scene


@router.delete("/{scene_id}", status_code=204)
def delete_scene(
    project_id: uuid.UUID,
    scene_id: uuid.UUID,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _get_owned_project(db, current.id, project_id)
    scene = db.get(models.Scene, scene_id)
    if scene is None or scene.project_id != project_id:
        raise HTTPException(status_code=404, detail="Scene not found")
    now = utcnow()
    db.delete(scene)
    parent = db.get(models.Project, project_id)
    if parent is not None:
        parent.updated_at = now
        parent.version = parent.version + 1
        db.add(parent)
    db.commit()
