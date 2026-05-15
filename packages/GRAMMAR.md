# .sp screenplay grammar (MVP)

## Document

1. Optional **document header**: lines of the form `KEY: value` (colon separates key and value). Blank lines are allowed.
2. A **delimiter line**: at least six characters, each a dash-like glyph (`-`, `─`, `═`, `━`, `‐`, `_`).
3. One or more **scenes**.

## Scene

1. Line `SCENE` + whitespace + positive integer (e.g. `SCENE 1`).
2. **Scene metadata**: lines `KEY: value` until the next delimiter line.
3. Delimiter line ends the scene header.
4. **Scene body**: blocks until the next scene (delimiter whose following non-blank line is `SCENE n`) or end of file.

## Body blocks

- **ACTION** — a line exactly `ACTION` (case-sensitive). Following non-blank lines belong to the action until the next block start.
- **Notes** — a line exactly one of: `DIRECTOR NOTE`, `SHOT NOTE`, `SHOOT NOTES`. Following lines belong to the note until the next block start.
- **Dialogue** — a **character cue** line: no colon, all uppercase (Unicode casefold), at least two characters, not a reserved heading, not `SCENE`. Following lines are dialogue until the next block start.

## Block boundaries

The next block starts when a line is: a delimiter starting a new scene, `ACTION`, a note heading, or a character cue.

## Errors

The parser reports `{ line, code }` entries with 1-based line numbers. It does not echo screenplay text in error codes.
