import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from assistant_director_api.db import models
from assistant_director_api.db.session import get_db
from assistant_director_api.deps import get_current_user, utcnow
from assistant_director_api.schemas import ProjectCreate, ProjectPatch, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_owned_project(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[models.Project]:
    stmt = select(models.Project).where(models.Project.owner_id == current.id).order_by(models.Project.updated_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    payload: ProjectCreate,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Project:
    now = utcnow()
    project_id = payload.id or uuid.uuid4()
    if db.get(models.Project, project_id) is not None:
        raise HTTPException(status_code=409, detail="Project id already exists")
    project = models.Project(
        id=project_id,
        owner_id=current.id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        is_archived=False,
        archived_at=None,
        created_at=now,
        updated_at=now,
        version=1,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: uuid.UUID,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Project:
    return _get_owned_project(db, current.id, project_id)


@router.patch("/{project_id}", response_model=ProjectResponse)
def patch_project(
    project_id: uuid.UUID,
    payload: ProjectPatch,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Project:
    project = _get_owned_project(db, current.id, project_id)
    if payload.title is not None:
        project.title = payload.title.strip()
    if payload.description is not None:
        project.description = payload.description.strip()
    if payload.is_archived is not None:
        project.is_archived = payload.is_archived
    if payload.archived_at is not None:
        project.archived_at = payload.archived_at
    project.updated_at = utcnow()
    project.version = project.version + 1
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
