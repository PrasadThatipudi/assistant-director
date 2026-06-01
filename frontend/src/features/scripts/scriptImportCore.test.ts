import { describe, expect, it } from 'vitest';

import { formatScriptValidationError, validateSpTextOrThrowJsonDetail } from './scriptImportCore';

describe('formatScriptValidationError', () => {
  it('returns null for non-JSON messages', () => {
    expect(formatScriptValidationError('plain error')).toBeNull();
  });

  it('formats array detail from parse failure JSON', () => {
    const msg = JSON.stringify({
      detail: [{ line: 3, code: 'unknown_body_line' }],
    });
    const out = formatScriptValidationError(msg);
    expect(out).not.toBeNull();
    expect(out?.title).toBe('Invalid screenplay');
    expect(out?.message).toContain('Line 3:');
    expect(out?.message).not.toContain('unknown_body_line');
    expect(out?.message).toMatch(/not recognized|screenplay format/i);
    expect(out?.message).toContain('This screenplay could not be parsed.');
  });

  it('formats string detail', () => {
    const msg = JSON.stringify({ detail: 'bad format' });
    const out = formatScriptValidationError(msg);
    expect(out).toEqual({ title: 'Invalid screenplay', message: 'bad format' });
  });
});

describe('validateSpTextOrThrowJsonDetail', () => {
  const minimal = `TITLE: Test Piece
LANGUAGE: Telugu

----------------------------------------
SCENE 1
LOCATION: Somewhere
----------------------------------------

ACTION
Hello.
`;

  it('does not throw for valid template text', () => {
    expect(() => validateSpTextOrThrowJsonDetail(minimal)).not.toThrow();
  });

  it('throws JSON with detail array for invalid text', () => {
    const bad = `TITLE: X

----------------------------------------
SCENE 1
LOCATION: A
----------------------------------------

not a valid block start
`;
    expect(() => validateSpTextOrThrowJsonDetail(bad)).toThrow();
    try {
      validateSpTextOrThrowJsonDetail(bad);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      const parsed = JSON.parse((e as Error).message) as { detail: unknown };
      expect(Array.isArray(parsed.detail)).toBe(true);
    }
  });
});
