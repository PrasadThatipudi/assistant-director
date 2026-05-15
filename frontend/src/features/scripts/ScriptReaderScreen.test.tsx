import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

const MINIMAL_SP = `TITLE: Test Piece
LANGUAGE: Telugu

----------------------------------------
SCENE 1
LOCATION: Somewhere
----------------------------------------

ACTION
Hello.
`;

vi.mock('./scriptStorage', () => ({
  readCachedScriptAsText: vi.fn(() => Promise.resolve(MINIMAL_SP)),
}));

describe('ScriptReaderScreen', () => {
  it('shows structured content after load', async () => {
    const { ScriptReaderScreen } = await import('./ScriptReaderScreen');
    const route = { key: 'r', name: 'ScriptReader' as const, params: { projectId: 'proj-1' } };
    const navigation = { setOptions: vi.fn(), navigate: vi.fn() } as never;

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ScriptReaderScreen route={route} navigation={navigation} />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const json = tree!.toJSON();
    expect(json).not.toBeNull();
    const flat = JSON.stringify(json);
    expect(flat).toContain('Test Piece');
  });
});
