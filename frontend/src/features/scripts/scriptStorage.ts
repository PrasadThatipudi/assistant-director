import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import { openAssistantDatabase } from '../../data/db/openDatabase';
import { parseResultOk, parseSpDocument } from './parsing/scriptParsingAdapter';

const MAX_OCTET_STREAM_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_SCRIPT_BYTES = 20 * 1024 * 1024;

export type ScriptImportPhase = 'validating' | 'saving';

export type LocalScriptAttachment = {
  projectId: string;
  localAssetId: string;
  version: number;
  sourceFilename: string | null;
};

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
        .map((item) => `Line ${item.line ?? '?'}: ${item.code ?? 'error'}`);
      const body = ['This .sp file could not be parsed.', ...lines].join('\n');
      return { title: 'Invalid screenplay', message: body };
    }
  } catch {
    return null;
  }
  return null;
}

function cachedBinaryFallbackMessage(mimeType: string, localUri: string): string {
  return `Cached file (${mimeType}) is stored offline. Path: ${localUri}`;
}

function filenameLooksLikePlainTextScript(fileName: string): boolean {
  const normalized = fileName.trim().toLowerCase();
  return /\.(sp|fountain|txt|md|markdown)$/.test(normalized);
}

function wrapScriptImportError(label: string, e: unknown): never {
  const detail = e instanceof Error ? e.message : String(e);
  throw new Error(`${label}: ${detail}`);
}

async function resolveReadableFileUri(localUri: string): Promise<string> {
  if (!localUri.toLowerCase().startsWith('content://')) {
    return localUri;
  }
  const cacheRoot = FileSystem.cacheDirectory;
  if (!cacheRoot) {
    throw new Error('SCRIPT_IMPORT_CACHE_UNAVAILABLE: cache directory unavailable');
  }
  const dest = `${cacheRoot}script-import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    await FileSystem.copyAsync({ from: localUri, to: dest });
  } catch (e) {
    wrapScriptImportError('SCRIPT_IMPORT_COPY', e);
  }
  return dest;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export async function importScriptForProjectLocally(
  projectId: string,
  localUri: string,
  fileName: string,
  mimeType: string,
  onPhase?: (phase: ScriptImportPhase) => void,
): Promise<LocalScriptAttachment> {
  const db = openAssistantDatabase();
  const readUri = await resolveReadableFileUri(localUri);
  const info = await FileSystem.getInfoAsync(readUri);
  if (!info.exists || typeof info.size !== 'number') {
    throw new Error('SCRIPT_IMPORT_READ: file not found');
  }
  if (info.size > MAX_SCRIPT_BYTES) {
    throw new Error('SCRIPT_IMPORT_TOO_LARGE: file exceeds 20MB limit');
  }

  let text: string;
  try {
    text = await FileSystem.readAsStringAsync(readUri, { encoding: FileSystem.EncodingType.UTF8 });
  } catch (e) {
    wrapScriptImportError('SCRIPT_IMPORT_READ', e);
  }

  if (utf8ByteLength(text) > MAX_SCRIPT_BYTES) {
    throw new Error('SCRIPT_IMPORT_TOO_LARGE: file exceeds 20MB limit');
  }

  onPhase?.('validating');
  const parseOutcome = parseSpDocument(text);
  if (!parseResultOk(parseOutcome)) {
    const detail = parseOutcome.errors.map((err) => ({ line: err.line, code: err.code }));
    throw new Error(JSON.stringify({ detail }));
  }

  onPhase?.('saving');
  const localAssetId = Crypto.randomUUID();
  const root = FileSystem.documentDirectory ?? '';
  const dir = `${root}scripts`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const dest = `${dir}/${localAssetId}.sp`;
  try {
    await FileSystem.writeAsStringAsync(dest, text, { encoding: FileSystem.EncodingType.UTF8 });
  } catch (e) {
    wrapScriptImportError('SCRIPT_IMPORT_WRITE', e);
  }

  const contentSha256 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    text,
  );
  const byteSize = utf8ByteLength(text);
  const now = new Date().toISOString();
  const prior = db.getFirstSync<{ version: number }>(
    'SELECT version FROM script_cache WHERE project_id = ?',
    projectId,
  );
  const nextVersion = (prior?.version ?? 0) + 1;

  db.runSync(
    `INSERT OR REPLACE INTO script_cache (project_id, local_asset_id, version, content_sha256, mime_type, local_uri, byte_size, updated_at, source_filename)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectId,
    localAssetId,
    nextVersion,
    contentSha256,
    mimeType,
    dest,
    byteSize,
    now,
    fileName.trim() ? fileName : null,
  );

  return {
    projectId,
    localAssetId,
    version: nextVersion,
    sourceFilename: fileName.trim() ? fileName : null,
  };
}

export function getScriptCacheRow(projectId: string): {
  localAssetId: string;
  mimeType: string;
  localUri: string;
  version: number;
  sourceFilename: string | null;
} | null {
  const db = openAssistantDatabase();
  const row = db.getFirstSync<{
    local_asset_id: string;
    mime_type: string;
    local_uri: string;
    version: number;
    source_filename: string | null;
  }>(
    'SELECT local_asset_id, mime_type, local_uri, version, source_filename FROM script_cache WHERE project_id = ?',
    projectId,
  );
  if (!row) {
    return null;
  }
  return {
    localAssetId: row.local_asset_id,
    mimeType: row.mime_type,
    localUri: row.local_uri,
    version: row.version,
    sourceFilename: row.source_filename,
  };
}

export async function readCachedScriptAsText(projectId: string): Promise<string | null> {
  const row = getScriptCacheRow(projectId);
  if (!row) {
    return null;
  }
  const mimeLower = row.mimeType.toLowerCase();
  const isTextLikeMime = mimeLower.includes('text') || mimeLower.includes('json');
  if (isTextLikeMime) {
    try {
      return await FileSystem.readAsStringAsync(row.localUri, { encoding: FileSystem.EncodingType.UTF8 });
    } catch {
      return null;
    }
  }
  const isOctetStream = mimeLower.includes('octet-stream');
  const name = row.sourceFilename ?? '';
  if (isOctetStream && name && filenameLooksLikePlainTextScript(name)) {
    const info = await FileSystem.getInfoAsync(row.localUri);
    if (!info.exists || typeof info.size !== 'number' || info.size > MAX_OCTET_STREAM_TEXT_BYTES) {
      return cachedBinaryFallbackMessage(row.mimeType, row.localUri);
    }
    try {
      return await FileSystem.readAsStringAsync(row.localUri, { encoding: FileSystem.EncodingType.UTF8 });
    } catch {
      return cachedBinaryFallbackMessage(row.mimeType, row.localUri);
    }
  }
  return cachedBinaryFallbackMessage(row.mimeType, row.localUri);
}
