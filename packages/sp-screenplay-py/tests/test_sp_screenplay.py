from pathlib import Path

import pytest

from sp_screenplay import SpScreenplayValidationError, parse_sp, validate_sp_bytes

_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "minimal.txt"


def test_validate_accepts_minimal_fixture() -> None:
    data = _FIXTURE.read_bytes()
    validate_sp_bytes(filename="draft.txt", data=data)


def test_parse_minimal_fixture_structure() -> None:
    text = _FIXTURE.read_text(encoding="utf-8")
    result = parse_sp(text)
    assert result.ok
    assert result.document is not None
    assert result.document.header.get("TITLE") == "Test Piece"
    assert len(result.document.scenes) == 1
    assert result.document.scenes[0].number == 1
    assert result.document.scenes[0].meta.get("LOCATION") == "Somewhere"
    assert len(result.document.scenes[0].blocks) == 1
    b0 = result.document.scenes[0].blocks[0]
    assert b0.kind == "action"
    assert b0.lines == ["Hello."]


def test_validate_rejects_wrong_extension() -> None:
    data = _FIXTURE.read_bytes()
    with pytest.raises(SpScreenplayValidationError) as exc:
        validate_sp_bytes(filename="draft.pdf", data=data)
    assert exc.value.status_code == 415


def test_validate_rejects_invalid_utf8() -> None:
    with pytest.raises(SpScreenplayValidationError) as exc:
        validate_sp_bytes(filename="x.txt", data=b"\xff\xfe\xfd")
    assert exc.value.status_code == 400


def test_parse_rejects_unknown_body_line() -> None:
    text = """TITLE: X

----------------------------------------
SCENE 1
LOCATION: A
----------------------------------------

not a valid block start
"""
    result = parse_sp(text)
    assert not result.ok
    assert any(e.code == "unknown_body_line" for e in result.errors)
