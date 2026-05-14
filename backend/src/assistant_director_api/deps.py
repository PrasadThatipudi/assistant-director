from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from assistant_director_api.db import models
from assistant_director_api.db.session import get_db


def parse_bearer_user_id(authorization: str | None) -> uuid.UUID:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(None, 1)[1].strip()
    try:
        return uuid.UUID(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid bearer token") from None


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> models.User:
    user_id = parse_bearer_user_id(authorization)
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
