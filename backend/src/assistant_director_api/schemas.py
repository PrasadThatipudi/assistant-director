import re
import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserCreate(BaseModel):
    email: str = Field(max_length=255)

    @field_validator("email")
    @classmethod
    def email_shape(cls, value: str) -> str:
        trimmed = value.strip().lower()
        if not _EMAIL_RE.match(trimmed):
            raise ValueError("Invalid email format")
        return trimmed


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    id: Optional[uuid.UUID] = None
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)


class ProjectPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    is_archived: Optional[bool] = None
    archived_at: Optional[datetime] = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str
    is_archived: bool
    archived_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    version: int

    model_config = {"from_attributes": True}


class SceneCreate(BaseModel):
    id: Optional[uuid.UUID] = None
    sort_index: int = Field(default=0, ge=0, le=10_000)
    body: dict[str, Any] = Field(default_factory=dict)


class ScenePatch(BaseModel):
    sort_index: Optional[int] = Field(default=None, ge=0, le=10_000)
    body: Optional[dict[str, Any]] = None


class SceneResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    sort_index: int
    body: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    version: int

    model_config = {"from_attributes": True}


class SyncOperation(BaseModel):
    client_op_id: str = Field(min_length=1, max_length=64)
    entity_type: Literal["project", "scene"]
    entity_id: uuid.UUID
    op: Literal["upsert", "delete"]
    payload: Optional[dict[str, Any]] = None
    client_updated_at: datetime


class SyncPushRequest(BaseModel):
    operations: list[SyncOperation] = Field(default_factory=list, max_length=200)


class SyncOperationResult(BaseModel):
    client_op_id: str
    status: Literal["accepted", "rejected", "conflict"]
    detail: Optional[str] = None
    server_payload: Optional[dict[str, Any]] = None


class SyncPushResponse(BaseModel):
    results: list[SyncOperationResult]
