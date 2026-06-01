import { parseResultOk, parseSpDocument } from './parsing/scriptParsingAdapter';
import { parseErrorCodeToUserMessage } from './scriptUiCopy';

type FastApiStyleDetailItem = { line?: number; code?: string };

export function formatScriptValidationError(rawMessage: string): { title: string; message: string } | null {
  const trimmed = rawMessage.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    const detail = parsed.detail;
    if (typeof detail === 'string') {
      return { title: 'Invalid screenplay', message: detail };
    }
    if (Array.isArray(detail)) {
      const lines = detail
        .filter((item): item is FastApiStyleDetailItem => typeof item === 'object' && item !== null)
        .slice(0, 2)
        .map(
          (item) =>
            `Line ${item.line ?? '?'}: ${parseErrorCodeToUserMessage(String(item.code ?? ''))}`,
        );
      const body = ['This screenplay could not be parsed.', ...lines].join('\n');
      return { title: 'Invalid screenplay', message: body };
    }
  } catch {
    return null;
  }
  return null;
}

/** Throws `Error` with JSON body `{ detail: [...] }` when parse fails (same shape as legacy API errors). */
export function validateSpTextOrThrowJsonDetail(text: string): void {
  const parseOutcome = parseSpDocument(text);
  if (parseResultOk(parseOutcome)) {
    return;
  }
  const detail = parseOutcome.errors.map((err) => ({ line: err.line, code: err.code }));
  throw new Error(JSON.stringify({ detail }));
}
