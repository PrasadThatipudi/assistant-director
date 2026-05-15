from __future__ import annotations

import re

from sp_screenplay.model import (
    ActionBlock,
    DialogueBlock,
    NoteBlock,
    ParseError,
    SpDocument,
    SpParseResult,
    SpScene,
)

_DASH_CHARS = frozenset("-─═━‐_")

NOTE_HEADINGS = frozenset(
    {
        "DIRECTOR NOTE",
        "SHOT NOTE",
        "SHOOT NOTES",
    }
)
BLOCK_HEADINGS = NOTE_HEADINGS | {"ACTION"}

_SCENE_RE = re.compile(r"^SCENE\s+(\d+)\s*$", re.IGNORECASE)


def is_delimiter_line(stripped: str) -> bool:
    if len(stripped) < 6:
        return False
    return all(c in _DASH_CHARS for c in stripped)


def is_scene_heading(stripped: str) -> bool:
    return _SCENE_RE.match(stripped) is not None


def scene_number_from_heading(stripped: str) -> int | None:
    m = _SCENE_RE.match(stripped)
    if m is None:
        return None
    return int(m.group(1))


def is_character_cue(stripped: str) -> bool:
    if not stripped or ":" in stripped:
        return False
    if stripped in BLOCK_HEADINGS:
        return False
    if is_scene_heading(stripped):
        return False
    if stripped.upper() != stripped:
        return False
    if len(stripped) < 2:
        return False
    return any(c.isalpha() for c in stripped)


def parse_meta_line(stripped: str) -> tuple[str, str] | None:
    if ":" not in stripped:
        return None
    key, _, rest = stripped.partition(":")
    key = key.strip()
    if not key:
        return None
    return key, rest.strip()


def _is_new_scene_at(lines: list[str], j: int, n: int) -> bool:
    if j >= n or not is_delimiter_line(lines[j].strip()):
        return False
    k = j + 1
    while k < n and not lines[k].strip():
        k += 1
    if k >= n:
        return False
    return is_scene_heading(lines[k].strip())


def _parse_body(lines: list[str], start: int, n: int) -> tuple[int, list[SpBlock], list[ParseError]]:
    blocks: list[SpBlock] = []
    errors: list[ParseError] = []
    i = start

    while i < n:
        if _is_new_scene_at(lines, i, n):
            return i, blocks, errors

        stripped = lines[i].strip()
        line_no = i + 1

        if not stripped:
            i += 1
            continue

        if stripped == "ACTION":
            i += 1
            chunk: list[str] = []
            while i < n:
                if _is_new_scene_at(lines, i, n):
                    break
                s = lines[i].strip()
                if s == "ACTION" or s in NOTE_HEADINGS or is_character_cue(s):
                    break
                chunk.append(lines[i].rstrip())
                i += 1
            while chunk and chunk[-1] == "":
                chunk.pop()
            blocks.append(ActionBlock(lines=chunk))
            continue

        if stripped in NOTE_HEADINGS:
            note_type = stripped
            i += 1
            chunk = []
            while i < n:
                if _is_new_scene_at(lines, i, n):
                    break
                s = lines[i].strip()
                if s == "ACTION" or s in NOTE_HEADINGS or is_character_cue(s):
                    break
                chunk.append(lines[i].rstrip())
                i += 1
            while chunk and chunk[-1] == "":
                chunk.pop()
            blocks.append(NoteBlock(note_type=note_type, lines=chunk))
            continue

        if is_character_cue(stripped):
            character = stripped
            i += 1
            chunk = []
            while i < n:
                if _is_new_scene_at(lines, i, n):
                    break
                s = lines[i].strip()
                if s == "ACTION" or s in NOTE_HEADINGS or is_character_cue(s):
                    break
                chunk.append(lines[i].rstrip())
                i += 1
            while chunk and chunk[-1] == "":
                chunk.pop()
            blocks.append(DialogueBlock(character=character, lines=chunk))
            continue

        errors.append(ParseError(line=line_no, code="unknown_body_line"))
        return start, [], errors

    return i, blocks, errors


def parse_sp(text: str) -> SpParseResult:
    errors: list[ParseError] = []
    lines = [ln.rstrip("\r") for ln in text.splitlines()]
    n = len(lines)
    i = 0
    header: dict[str, str] = {}

    while i < n:
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue
        if is_delimiter_line(stripped):
            i += 1
            break
        if is_scene_heading(stripped):
            errors.append(ParseError(line=i + 1, code="header_scene_before_delimiter"))
            return SpParseResult(document=None, errors=errors)
        meta = parse_meta_line(stripped)
        if meta is None:
            errors.append(ParseError(line=i + 1, code="header_invalid_line"))
            return SpParseResult(document=None, errors=errors)
        header[meta[0]] = meta[1]
        i += 1
    else:
        errors.append(ParseError(line=max(1, n), code="missing_initial_delimiter"))
        return SpParseResult(document=None, errors=errors)

    scenes: list[SpScene] = []

    while i < n:
        while i < n and not lines[i].strip():
            i += 1
        if i >= n:
            break
        while i < n and is_delimiter_line(lines[i].strip()):
            i += 1
            while i < n and not lines[i].strip():
                i += 1
        if i >= n:
            break

        stripped = lines[i].strip()
        if not is_scene_heading(stripped):
            errors.append(ParseError(line=i + 1, code="expected_scene_heading"))
            return SpParseResult(document=None, errors=errors)

        num = scene_number_from_heading(stripped)
        if num is None:
            errors.append(ParseError(line=i + 1, code="invalid_scene_heading"))
            return SpParseResult(document=None, errors=errors)
        i += 1

        meta: dict[str, str] = {}
        while i < n:
            s2 = lines[i].strip()
            if not s2:
                i += 1
                continue
            if is_delimiter_line(s2):
                i += 1
                break
            if is_scene_heading(s2):
                errors.append(ParseError(line=i + 1, code="scene_heading_inside_metadata"))
                return SpParseResult(document=None, errors=errors)
            pm = parse_meta_line(s2)
            if pm is None:
                errors.append(ParseError(line=i + 1, code="invalid_scene_metadata"))
                return SpParseResult(document=None, errors=errors)
            meta[pm[0]] = pm[1]
            i += 1
        else:
            errors.append(ParseError(line=n, code="scene_missing_end_delimiter"))
            return SpParseResult(document=None, errors=errors)

        body_end, body_blocks, body_errors = _parse_body(lines, i, n)
        errors.extend(body_errors)
        if body_errors:
            return SpParseResult(document=None, errors=errors)
        scenes.append(SpScene(number=num, meta=meta, blocks=body_blocks))
        i = body_end

    if not scenes:
        errors.append(ParseError(line=1, code="no_scenes"))
        return SpParseResult(document=None, errors=errors)

    return SpParseResult(document=SpDocument(header=header, scenes=scenes), errors=[])
