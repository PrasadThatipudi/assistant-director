from __future__ import annotations

import re
from pathlib import Path

from sp_screenplay.errors import SpScreenplayValidationError

HEADER_TITLE_SCAN_LINE_COUNT = 80
SCENE_HEADING_PATTERN = re.compile(r"^SCENE\s+\d+\s*$", re.MULTILINE)


def validate_sp_bytes(*, filename: str | None, data: bytes) -> str:
    if not data:
        raise SpScreenplayValidationError("Screenplay file is empty", status_code=400)

    basename = Path(filename or "").name
    if not basename:
        raise SpScreenplayValidationError(
            "Only .txt screenplay template files are supported",
            status_code=415,
        )

    if Path(basename).suffix.lower() != ".txt":
        raise SpScreenplayValidationError(
            "Only .txt screenplay template files are supported",
            status_code=415,
        )

    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise SpScreenplayValidationError(
            "Screenplay must be valid UTF-8 text",
            status_code=400,
        ) from exc

    if not _header_has_title(text):
        raise SpScreenplayValidationError(
            "Screenplay must include a TITLE line near the top of the file",
            status_code=400,
        )

    if SCENE_HEADING_PATTERN.search(text) is None:
        raise SpScreenplayValidationError(
            "Screenplay must include at least one SCENE heading (for example SCENE 1)",
            status_code=400,
        )

    return text


def _header_has_title(text: str) -> bool:
    lines = text.splitlines()
    for raw in lines[:HEADER_TITLE_SCAN_LINE_COUNT]:
        if raw.strip().startswith("TITLE:"):
            return True
    return False
