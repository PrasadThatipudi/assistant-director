const DEFAULT_PARSE_HINT =
  "This line doesn't match the expected screenplay format.";

const PARSE_CODE_MESSAGES: Record<string, string> = {
  unknown_body_line: 'This line is not recognized as part of a scene (action, character, or dialogue).',
  header_scene_before_delimiter: 'A scene appears before the script header is finished. Check the top of the file.',
  header_invalid_line: 'The title block has a line the app does not recognize.',
  missing_initial_delimiter: 'The script is missing the opening divider line before the first scene.',
  expected_scene_heading: 'A scene heading (for example SCENE 1) was expected here.',
  invalid_scene_heading: 'This scene heading is not in the expected form.',
  scene_heading_inside_metadata: 'A scene heading appeared inside location or other scene details.',
  invalid_scene_metadata: 'Location or other scene details are not formatted as expected.',
  scene_missing_end_delimiter: 'This scene is missing the closing divider before the next part of the script.',
  no_scenes: 'No scenes were found. Add at least one scene with the usual dividers and headings.',
};

/** Shown when cached file cannot be read as screenplay text (no MIME or file paths). */
export const CACHED_SCRIPT_NON_TEXT_PLACEHOLDER =
  "This screenplay file can't be opened as text in the app. Try attaching a .txt template file again from the project screen.";

export function isNonTextScriptPlaceholder(body: string): boolean {
  return body === CACHED_SCRIPT_NON_TEXT_PLACEHOLDER;
}

export function parseErrorCodeToUserMessage(code: string): string {
  const mapped = PARSE_CODE_MESSAGES[code];
  if (mapped) {
    return mapped;
  }
  return DEFAULT_PARSE_HINT;
}

export type AttachedScriptSummaryInput = {
  version: number;
  sourceFilename: string | null;
};

export function formatAttachedScriptSummary(meta: AttachedScriptSummaryInput): string {
  const versionPhrase = `Saved as version ${meta.version}`;
  const formatPhrase = 'Assistant Director screenplay template (.txt)';
  const name = meta.sourceFilename?.trim();
  if (name) {
    return `${name} · ${versionPhrase} · ${formatPhrase}`;
  }
  return `${versionPhrase} · ${formatPhrase}`;
}
