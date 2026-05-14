from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from assistant_director_api.db import models
from assistant_director_api.db.session import get_db
from assistant_director_api.deps import get_current_user
from assistant_director_api.schemas import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=201)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> models.User:
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(email=payload.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def read_me(current: models.User = Depends(get_current_user)) -> models.User:
    return current
