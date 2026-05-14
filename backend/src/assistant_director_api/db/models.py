from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import mapped_column, relationship

from assistant_director_api.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = mapped_column(String(255), unique=True, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    projects = relationship("Project", back_populates="owner")


class Project(Base):
    __tablename__ = "projects"

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = mapped_column(String(120), nullable=False)
    description = mapped_column(Text, nullable=False, default="")
    is_archived = mapped_column(Boolean, nullable=False, default=False)
    archived_at = mapped_column(DateTime(timezone=True), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    version = mapped_column(Integer, nullable=False, default=1)

    owner = relationship("User", back_populates="projects")
    scenes = relationship("Scene", back_populates="project", cascade="all, delete-orphan")
    script_artifacts = relationship(
        "ScriptArtifact", back_populates="project", cascade="all, delete-orphan"
    )


class Scene(Base):
    __tablename__ = "scenes"

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sort_index = mapped_column(Integer, nullable=False, default=0)
    body = mapped_column(JSONB, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    version = mapped_column(Integer, nullable=False, default=1)

    project = relationship("Project", back_populates="scenes")


class ScriptArtifact(Base):
    __tablename__ = "script_artifacts"

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version = mapped_column(Integer, nullable=False)
    storage_key = mapped_column(String(512), nullable=False)
    content_sha256 = mapped_column(String(64), nullable=False)
    mime_type = mapped_column(String(128), nullable=False)
    byte_size = mapped_column(Integer, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="script_artifacts")
