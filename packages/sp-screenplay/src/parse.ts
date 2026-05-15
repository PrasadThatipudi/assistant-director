import type {
  ActionBlock,
  DialogueBlock,
  NoteBlock,
  ParseError,
  SpBlock,
  SpDocument,
  SpParseResult,
  SpScene,
} from './types';

const DASH_CHARS = new Set('-─═━‐_');

const NOTE_HEADINGS = new Set(['DIRECTOR NOTE', 'SHOT NOTE', 'SHOOT NOTES']);
const BLOCK_HEADINGS = new Set([...NOTE_HEADINGS, 'ACTION']);

const SCENE_RE = /^SCENE\s+(\d+)\s*$/i;

export function isDelimiterLine(stripped: string): boolean {
  if (stripped.length < 6) {
    return false;
  }
  for (const c of stripped) {
    if (!DASH_CHARS.has(c)) {
      return false;
    }
  }
  return true;
}

export function isSceneHeading(stripped: string): boolean {
  return SCENE_RE.test(stripped);
}

export function sceneNumberFromHeading(stripped: string): number | null {
  const m = stripped.match(SCENE_RE);
  if (!m) {
    return null;
  }
  return parseInt(m[1]!, 10);
}

export function isCharacterCue(stripped: string): boolean {
  if (!stripped || stripped.includes(':')) {
    return false;
  }
  if (BLOCK_HEADINGS.has(stripped)) {
    return false;
  }
  if (isSceneHeading(stripped)) {
    return false;
  }
  if (stripped.toUpperCase() !== stripped) {
    return false;
  }
  if (stripped.length < 2) {
    return false;
  }
  return /[A-Za-z]/.test(stripped) && stripped === stripped.toUpperCase();
}

export function parseMetaLine(stripped: string): [string, string] | null {
  const idx = stripped.indexOf(':');
  if (idx < 0) {
    return null;
  }
  const key = stripped.slice(0, idx).trim();
  if (!key) {
    return null;
  }
  return [key, stripped.slice(idx + 1).trim()];
}

function isNewSceneAt(lines: string[], j: number, n: number): boolean {
  if (j >= n || !isDelimiterLine(lines[j]!.trim())) {
    return false;
  }
  let k = j + 1;
  while (k < n && !lines[k]!.trim()) {
    k += 1;
  }
  if (k >= n) {
    return false;
  }
  return isSceneHeading(lines[k]!.trim());
}

function parseBody(lines: string[], start: number, n: number): { end: number; blocks: SpBlock[]; errors: ParseError[] } {
  const blocks: SpBlock[] = [];
  const errors: ParseError[] = [];
  let i = start;

  while (i < n) {
    if (isNewSceneAt(lines, i, n)) {
      return { end: i, blocks, errors };
    }

    const stripped = lines[i]!.trim();
    const lineNo = i + 1;

    if (!stripped) {
      i += 1;
      continue;
    }

    if (stripped === 'ACTION') {
      i += 1;
      const chunk: string[] = [];
      while (i < n) {
        if (isNewSceneAt(lines, i, n)) {
          break;
        }
        const s = lines[i]!.trim();
        if (s === 'ACTION' || NOTE_HEADINGS.has(s) || isCharacterCue(s)) {
          break;
        }
        chunk.push(lines[i]!.replace(/\r$/, ''));
        i += 1;
      }
      while (chunk.length > 0 && chunk[chunk.length - 1] === '') {
        chunk.pop();
      }
      blocks.push({ kind: 'action', lines: chunk } satisfies ActionBlock);
      continue;
    }

    if (NOTE_HEADINGS.has(stripped)) {
      const noteType = stripped;
      i += 1;
      const chunk: string[] = [];
      while (i < n) {
        if (isNewSceneAt(lines, i, n)) {
          break;
        }
        const s = lines[i]!.trim();
        if (s === 'ACTION' || NOTE_HEADINGS.has(s) || isCharacterCue(s)) {
          break;
        }
        chunk.push(lines[i]!.replace(/\r$/, ''));
        i += 1;
      }
      while (chunk.length > 0 && chunk[chunk.length - 1] === '') {
        chunk.pop();
      }
      blocks.push({ kind: 'note', noteType, lines: chunk } satisfies NoteBlock);
      continue;
    }

    if (isCharacterCue(stripped)) {
      const character = stripped;
      i += 1;
      const chunk: string[] = [];
      while (i < n) {
        if (isNewSceneAt(lines, i, n)) {
          break;
        }
        const s = lines[i]!.trim();
        if (s === 'ACTION' || NOTE_HEADINGS.has(s) || isCharacterCue(s)) {
          break;
        }
        chunk.push(lines[i]!.replace(/\r$/, ''));
        i += 1;
      }
      while (chunk.length > 0 && chunk[chunk.length - 1] === '') {
        chunk.pop();
      }
      blocks.push({ kind: 'dialogue', character, lines: chunk } satisfies DialogueBlock);
      continue;
    }

    errors.push({ line: lineNo, code: 'unknown_body_line' });
    return { end: start, blocks: [], errors };
  }

  return { end: i, blocks, errors };
}

export function parseSpDocument(text: string): SpParseResult {
  const errors: ParseError[] = [];
  const lines = text.split(/\r?\n/).map((ln) => ln.replace(/\r$/, ''));
  const n = lines.length;
  let i = 0;
  const header: Record<string, string> = {};
  let headerBreak = false;

  while (i < n) {
    const stripped = lines[i]!.trim();
    if (!stripped) {
      i += 1;
      continue;
    }
    if (isDelimiterLine(stripped)) {
      i += 1;
      headerBreak = true;
      break;
    }
    if (isSceneHeading(stripped)) {
      errors.push({ line: i + 1, code: 'header_scene_before_delimiter' });
      return { document: null, errors };
    }
    const meta = parseMetaLine(stripped);
    if (!meta) {
      errors.push({ line: i + 1, code: 'header_invalid_line' });
      return { document: null, errors };
    }
    header[meta[0]] = meta[1];
    i += 1;
  }

  if (!headerBreak) {
    errors.push({ line: Math.max(1, n), code: 'missing_initial_delimiter' });
    return { document: null, errors };
  }

  const scenes: SpScene[] = [];

  while (i < n) {
    while (i < n && !lines[i]!.trim()) {
      i += 1;
    }
    if (i >= n) {
      break;
    }
    while (i < n && isDelimiterLine(lines[i]!.trim())) {
      i += 1;
      while (i < n && !lines[i]!.trim()) {
        i += 1;
      }
    }
    if (i >= n) {
      break;
    }

    const stripped = lines[i]!.trim();
    if (!isSceneHeading(stripped)) {
      errors.push({ line: i + 1, code: 'expected_scene_heading' });
      return { document: null, errors };
    }

    const num = sceneNumberFromHeading(stripped);
    if (num === null) {
      errors.push({ line: i + 1, code: 'invalid_scene_heading' });
      return { document: null, errors };
    }
    i += 1;

    const meta: Record<string, string> = {};
    let closedMeta = false;
    while (i < n) {
      const s2 = lines[i]!.trim();
      if (!s2) {
        i += 1;
        continue;
      }
      if (isDelimiterLine(s2)) {
        i += 1;
        closedMeta = true;
        break;
      }
      if (isSceneHeading(s2)) {
        errors.push({ line: i + 1, code: 'scene_heading_inside_metadata' });
        return { document: null, errors };
      }
      const pm = parseMetaLine(s2);
      if (!pm) {
        errors.push({ line: i + 1, code: 'invalid_scene_metadata' });
        return { document: null, errors };
      }
      meta[pm[0]] = pm[1];
      i += 1;
    }

    if (!closedMeta) {
      errors.push({ line: n, code: 'scene_missing_end_delimiter' });
      return { document: null, errors };
    }

    const { end, blocks, errors: bodyErrors } = parseBody(lines, i, n);
    errors.push(...bodyErrors);
    if (bodyErrors.length > 0) {
      return { document: null, errors };
    }
    scenes.push({ number: num, meta, blocks });
    i = end;
  }

  if (scenes.length === 0) {
    errors.push({ line: 1, code: 'no_scenes' });
    return { document: null, errors };
  }

  return { document: { header, scenes }, errors: [] };
}

export function isSpScreenplayFileName(fileName: string): boolean {
  const base = fileName.trim().split(/[/\\]/).pop() ?? '';
  return base.toLowerCase().endsWith('.sp');
}
