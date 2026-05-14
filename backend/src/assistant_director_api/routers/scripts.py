import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.responses import Response

from assistant_director_api.config import get_settings
from assistant_director_api.db import models
from assistant_director_api.db.session import get_db
from assistant_director_api.deps import get_current_user, utcnow
from assistant_director_api.routers.projects import _get_owned_project
from assistant_director_api.schemas import ScriptArtifactResponse
from assistant_director_api.services import blob_store
from assistant_director_api.services.sp_screenplay import (
    SP_SCREENPLAY_MEDIA_TYPE,
    SpScreenplayValidationError,
    validate_sp_screenplay_file,
)

router = APIRouter(tags=["scripts"])


@router.post("/projects/{project_id}/scripts", response_model=ScriptArtifactResponse, status_code=201)
async def upload_script(
    project_id: uuid.UUID,
    file: UploadFile,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.ScriptArtifact:
    _get_owned_project(db, current.id, project_id)
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    try:
        validate_sp_screenplay_file(filename=file.filename, data=data)
    except SpScreenplayValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from None
    settings = get_settings()
    settings.blob_storage_path.mkdir(parents=True, exist_ok=True)
    storage_key, digest = blob_store.save_blob(settings, data)
    current_max = db.scalar(
        select(func.max(models.ScriptArtifact.version)).where(models.ScriptArtifact.project_id == project_id)
    )
    next_version = (current_max or 0) + 1
    artifact = models.ScriptArtifact(
        project_id=project_id,
        version=next_version,
        storage_key=storage_key,
        content_sha256=digest,
        mime_type=SP_SCREENPLAY_MEDIA_TYPE[:128],
        byte_size=len(data),
    )
    db.add(artifact)
    parent = db.get(models.Project, project_id)
    if parent is not None:
        parent.updated_at = utcnow()
        parent.version = parent.version + 1
        db.add(parent)
    db.commit()
    db.refresh(artifact)
    return artifact


@router.get("/script-artifacts/{artifact_id}/file")
def download_script(
    artifact_id: uuid.UUID,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    artifact = db.get(models.ScriptArtifact, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    project = db.get(models.Project, artifact.project_id)
    if project is None or project.owner_id != current.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    settings = get_settings()
    try:
        data = blob_store.read_blob(settings, artifact.storage_key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Blob missing") from None
    return Response(content=data, media_type=artifact.mime_type)
