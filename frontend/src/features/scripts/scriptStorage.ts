import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import { openAssistantDatabase } from '../../data/db/openDatabase';
import { validateSpTextOrThrowJsonDetail } from './scriptImportCore';
import { CACHED_SCRIPT_NON_TEXT_PLACEHOLDER } from './scriptUiCopy';

const MAX_OCTET_STREAM_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_SCRIPT_BYTES = 20 * 1024 * 1024;

export type ScriptImportPhase = 'validating' | 'saving';

export type LocalScriptAttachment = {
  projectId: string;
  localAssetId: string;
  version: number;
  sourceFilename: string | null;
};

export { formatScriptValidationError } from './scriptImportCore';

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

export type ScriptTextImportMeta = {
  sourceFilename: string | null;
  mimeType: string;
};

export async function importScriptTextForProjectLocally(
  projectId: string,
  text: string,
  meta: ScriptTextImportMeta,
  onPhase?: (phase: ScriptImportPhase) => void,
): Promise<LocalScriptAttachment> {
  if (utf8ByteLength(text) > MAX_SCRIPT_BYTES) {
    throw new Error('SCRIPT_IMPORT_TOO_LARGE: file exceeds 20MB limit');
  }

  onPhase?.('validating');
  validateSpTextOrThrowJsonDetail(text);

  onPhase?.('saving');
  const db = openAssistantDatabase();
  const localAssetId = Crypto.randomUUID();
  const root = FileSystem.documentDirectory ?? '';
  const dir = `${root}scripts`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const dest = `${dir}/${localAssetId}.txt`;
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

  const sourceFilename = meta.sourceFilename?.trim() ? meta.sourceFilename.trim() : null;

  db.runSync(
    `INSERT OR REPLACE INTO script_cache (project_id, local_asset_id, version, content_sha256, mime_type, local_uri, byte_size, updated_at, source_filename)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectId,
    localAssetId,
    nextVersion,
    contentSha256,
    meta.mimeType,
    dest,
    byteSize,
    now,
    sourceFilename,
  );

  return {
    projectId,
    localAssetId,
    version: nextVersion,
    sourceFilename,
  };
}

export async function importScriptForProjectLocally(
  projectId: string,
  localUri: string,
  fileName: string,
  mimeType: string,
  onPhase?: (phase: ScriptImportPhase) => void,
): Promise<LocalScriptAttachment> {
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

  return importScriptTextForProjectLocally(
    projectId,
    text,
    {
      sourceFilename: fileName.trim() ? fileName : null,
      mimeType,
    },
    onPhase,
  );
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
      return CACHED_SCRIPT_NON_TEXT_PLACEHOLDER;
    }
    try {
      return await FileSystem.readAsStringAsync(row.localUri, { encoding: FileSystem.EncodingType.UTF8 });
    } catch {
      return CACHED_SCRIPT_NON_TEXT_PLACEHOLDER;
    }
  }
  return CACHED_SCRIPT_NON_TEXT_PLACEHOLDER;
}
