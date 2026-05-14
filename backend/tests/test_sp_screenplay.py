import pytest

from assistant_director_api.services.sp_screenplay import (
    SpScreenplayValidationError,
    validate_sp_screenplay_file,
)

_MINIMAL_VALID_SP = b"""TITLE: Test Piece
LANGUAGE: Telugu

----------------------------------------
SCENE 1
LOCATION: Somewhere
----------------------------------------

ACTION
Hello.
"""


def test_validate_sp_screenplay_file_accepts_minimal_valid() -> None:
    validate_sp_screenplay_file(filename="draft.sp", data=_MINIMAL_VALID_SP)


def test_validate_sp_screenplay_file_rejects_wrong_extension() -> None:
    with pytest.raises(SpScreenplayValidationError) as excinfo:
        validate_sp_screenplay_file(filename="draft.pdf", data=_MINIMAL_VALID_SP)
    assert excinfo.value.status_code == 415


def test_validate_sp_screenplay_file_rejects_missing_filename() -> None:
    with pytest.raises(SpScreenplayValidationError) as excinfo:
        validate_sp_screenplay_file(filename=None, data=_MINIMAL_VALID_SP)
    assert excinfo.value.status_code == 415


def test_validate_sp_screenplay_file_rejects_invalid_utf8() -> None:
    with pytest.raises(SpScreenplayValidationError) as excinfo:
        validate_sp_screenplay_file(filename="x.sp", data=b"\xff\xfe\xfd")
    assert excinfo.value.status_code == 400


def test_validate_sp_screenplay_file_rejects_missing_title() -> None:
    body = b"""NOTITLE: X

----------------------------------------
SCENE 1
----------------------------------------
"""
    with pytest.raises(SpScreenplayValidationError) as excinfo:
        validate_sp_screenplay_file(filename="x.sp", data=body)
    assert excinfo.value.status_code == 400


def test_validate_sp_screenplay_file_rejects_missing_scene_heading() -> None:
    body = b"""TITLE: Only Header

ACTION
No scene marker.
"""
    with pytest.raises(SpScreenplayValidationError) as excinfo:
        validate_sp_screenplay_file(filename="x.sp", data=body)
    assert excinfo.value.status_code == 400


def test_validate_sp_screenplay_file_rejects_empty_file() -> None:
    with pytest.raises(SpScreenplayValidationError) as excinfo:
        validate_sp_screenplay_file(filename="empty.sp", data=b"")
    assert excinfo.value.status_code == 400


def test_validate_sp_screenplay_file_accepts_uppercase_extension() -> None:
    validate_sp_screenplay_file(filename="Draft.SP", data=_MINIMAL_VALID_SP)
