import { describe, expect, it } from 'vitest';

import { parseSpDocument } from '../src/parse';

const MINIMAL_SP = `TITLE: Test Piece
LANGUAGE: Telugu

----------------------------------------
SCENE 1
LOCATION: Somewhere
----------------------------------------

ACTION
Hello.
`;

describe('parseSpDocument', () => {
  it('parses golden minimal fixture', () => {
    const r = parseSpDocument(MINIMAL_SP);
    expect(r.errors).toEqual([]);
    expect(r.document).not.toBeNull();
    expect(r.document!.header.TITLE).toBe('Test Piece');
    expect(r.document!.scenes).toHaveLength(1);
    expect(r.document!.scenes[0]!.number).toBe(1);
    expect(r.document!.scenes[0]!.meta.LOCATION).toBe('Somewhere');
    expect(r.document!.scenes[0]!.blocks).toHaveLength(1);
    expect(r.document!.scenes[0]!.blocks[0]!.kind).toBe('action');
    if (r.document!.scenes[0]!.blocks[0]!.kind === 'action') {
      expect(r.document!.scenes[0]!.blocks[0]!.lines).toEqual(['Hello.']);
    }
  });

  it('rejects unknown body line', () => {
    const text = `TITLE: X

----------------------------------------
SCENE 1
LOCATION: A
----------------------------------------

not a valid block start
`;
    const r = parseSpDocument(text);
    expect(r.document).toBeNull();
    expect(r.errors.some((e) => e.code === 'unknown_body_line')).toBe(true);
  });
});
