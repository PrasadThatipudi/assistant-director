from __future__ import annotations

import re
from pathlib import Path

HEADER_TITLE_SCAN_LINE_COUNT = 80
SCENE_HEADING_PATTERN = re.compile(r"^SCENE\s+\d+\s*$", re.MULTILINE)

SP_SCREENPLAY_MEDIA_TYPE = "text/x-sp; charset=utf-8"


class SpScreenplayValidationError(Exception):
    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def validate_sp_screenplay_file(*, filename: str | None, data: bytes) -> None:
    if not data:
        raise SpScreenplayValidationError("Screenplay file is empty", status_code=400)

    basename = Path(filename or "").name
    if not basename:
        raise SpScreenplayValidationError(
            "Only .sp screenplay files are supported",
            status_code=415,
        )

    if Path(basename).suffix.lower() != ".sp":
        raise SpScreenplayValidationError(
            "Only .sp screenplay files are supported",
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


def _header_has_title(text: str) -> bool:
    lines = text.splitlines()
    for raw in lines[:HEADER_TITLE_SCAN_LINE_COUNT]:
        if raw.strip().startswith("TITLE:"):
            return True
    return False
