from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True, slots=True)
class ParseError:
    line: int
    code: str


@dataclass(slots=True)
class ActionBlock:
    kind: Literal["action"] = "action"
    lines: list[str] = field(default_factory=list)


@dataclass(slots=True)
class NoteBlock:
    kind: Literal["note"] = "note"
    note_type: str = ""
    lines: list[str] = field(default_factory=list)


@dataclass(slots=True)
class DialogueBlock:
    kind: Literal["dialogue"] = "dialogue"
    character: str = ""
    lines: list[str] = field(default_factory=list)


SpBlock = ActionBlock | NoteBlock | DialogueBlock


@dataclass(slots=True)
class SpScene:
    number: int
    meta: dict[str, str] = field(default_factory=dict)
    blocks: list[SpBlock] = field(default_factory=list)


@dataclass(slots=True)
class SpDocument:
    header: dict[str, str] = field(default_factory=dict)
    scenes: list[SpScene] = field(default_factory=list)


@dataclass(slots=True)
class SpParseResult:
    document: SpDocument | None
    errors: list[ParseError] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors and self.document is not None
