import type { ProjectDraft } from './project.types';

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function stripControlCharacters(value: string): string {
  return value.replace(CONTROL_CHAR_PATTERN, '');
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export type ValidationResult =
  | { ok: true; value: ProjectDraft }
  | { ok: false; message: string };

export function validateProjectDraft(input: ProjectDraft): ValidationResult {
  const title = normalizeWhitespace(stripControlCharacters(input.title));
  if (title.length < 1) {
    return { ok: false, message: 'Title is required.' };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, message: `Title must be at most ${TITLE_MAX_LENGTH} characters.` };
  }

  const rawDescription = stripControlCharacters(input.description).trim();
  if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      message: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    };
  }

  return { ok: true, value: { title, description: rawDescription } };
}
