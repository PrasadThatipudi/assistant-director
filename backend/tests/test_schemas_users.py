"""Unit tests for Pydantic schemas (no HTTP / DB)."""

import pytest
from pydantic import ValidationError

from assistant_director_api.schemas import UserCreate


def test_user_create_email_normalized() -> None:
    u = UserCreate(email="  Test@Example.COM  ")
    assert u.email == "test@example.com"


@pytest.mark.parametrize(
    "bad",
    ["", "not-an-email", "a@", "@b.com", "spaces in@here.com"],
)
def test_user_create_rejects_invalid_email(bad: str) -> None:
    with pytest.raises(ValidationError):
        UserCreate(email=bad)
