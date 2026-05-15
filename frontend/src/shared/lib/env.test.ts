import { describe, expect, it } from 'vitest';

import { readPublicApiFromExtra, resolveRawApiBaseUrlFromParts } from './envResolve';

describe('readPublicApiFromExtra', () => {
  it('returns empty for non-object', () => {
    expect(readPublicApiFromExtra(null)).toBe('');
    expect(readPublicApiFromExtra(undefined)).toBe('');
    expect(readPublicApiFromExtra('x')).toBe('');
  });

  it('reads trimmed publicApiBaseUrl', () => {
    expect(readPublicApiFromExtra({ publicApiBaseUrl: '  http://host:8000  ' })).toBe('http://host:8000');
  });
});

describe('resolveRawApiBaseUrlFromParts', () => {
  it('prefers expoConfig extra over bundler env', () => {
    const v = resolveRawApiBaseUrlFromParts(
      { publicApiBaseUrl: 'http://from-expo/' },
      { publicApiBaseUrl: 'http://from-m2' },
      { publicApiBaseUrl: 'http://from-manifest' },
      'http://from-env',
    );
    expect(v).toBe('http://from-expo/');
  });

  it('falls through to manifest2 then manifest then env', () => {
    expect(
      resolveRawApiBaseUrlFromParts(undefined, { publicApiBaseUrl: 'http://m2' }, { publicApiBaseUrl: 'http://man' }, 'http://env'),
    ).toBe('http://m2');
    expect(resolveRawApiBaseUrlFromParts(undefined, undefined, { publicApiBaseUrl: 'http://man' }, 'http://env')).toBe(
      'http://man',
    );
    expect(resolveRawApiBaseUrlFromParts(undefined, undefined, undefined, '  http://env  ')).toBe('http://env');
  });

  it('returns empty when nothing set', () => {
    expect(resolveRawApiBaseUrlFromParts(undefined, undefined, undefined, undefined)).toBe('');
  });
});
