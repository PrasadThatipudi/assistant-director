import { describe, expect, it } from 'vitest';

import {
  formatAttachedScriptSummary,
  isNonTextScriptPlaceholder,
  CACHED_SCRIPT_NON_TEXT_PLACEHOLDER,
  parseErrorCodeToUserMessage,
} from './scriptUiCopy';

describe('formatAttachedScriptSummary', () => {
  it('includes filename, version phrase, and format when filename exists', () => {
    const s = formatAttachedScriptSummary({ version: 2, sourceFilename: 'MyFilm.txt' });
    expect(s).toContain('MyFilm.txt');
    expect(s).toContain('Saved as version 2');
    expect(s).toContain('Assistant Director screenplay template (.txt)');
  });

  it('omits filename when absent', () => {
    const s = formatAttachedScriptSummary({ version: 1, sourceFilename: null });
    expect(s).toBe('Saved as version 1 · Assistant Director screenplay template (.txt)');
  });
});

describe('parseErrorCodeToUserMessage', () => {
  it('maps known grammar codes to plain language', () => {
    expect(parseErrorCodeToUserMessage('expected_scene_heading')).toContain('scene heading');
  });

  it('returns default hint for unknown codes', () => {
    expect(parseErrorCodeToUserMessage('totally_unknown')).toContain("doesn't match");
  });
});

describe('isNonTextScriptPlaceholder', () => {
  it('matches only the canonical placeholder body', () => {
    expect(isNonTextScriptPlaceholder(CACHED_SCRIPT_NON_TEXT_PLACEHOLDER)).toBe(true);
    expect(isNonTextScriptPlaceholder('Cached file (')).toBe(false);
  });
});
