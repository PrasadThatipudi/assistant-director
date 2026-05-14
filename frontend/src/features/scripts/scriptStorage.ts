import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';

import { authorizationHeader, ensureApiUser } from '../../data/auth/session';
import { openAssistantDatabase } from '../../data/db/openDatabase';
import { flushOutbox } from '../../data/sync/outboxFlush';
import { getLocalProjectForServerEnsure } from '../projects/data/projectRepository';
import { getApiBaseUrl } from '../../shared/lib/env';

const MAX_OCTET_STREAM_TEXT_BYTES = 2 * 1024 * 1024;

export type ScriptArtifactDto = {
  id: string;
  project_id: string;
  version: number;
  content_sha256: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
};

function cachedBinaryFallbackMessage(mimeType: string, localUri: string): string {
  return `Cached file (${mimeType}) is stored offline. Path: ${localUri}`;
}

function filenameLooksLikePlainTextScript(fileName: string): boolean {
  const normalized = fileName.trim().toLowerCase();
  return /\.(fountain|txt|md|markdown)$/.test(normalized);
}

function wrapScriptUploadNetworkError(e: unknown): never {
  const detail = e instanceof Error ? e.message : String(e);
  if (detail.startsWith('SCRIPT_UPLOAD_NETWORK:')) {
    throw e instanceof Error ? e : new Error(detail);
  }
  throw new Error(`SCRIPT_UPLOAD_NETWORK: ${detail}`);
}

async function resolveUploadableFileUri(localUri: string): Promise<string> {
  if (!localUri.toLowerCase().startsWith('content://')) {
    return localUri;
  }
  const cacheRoot = FileSystem.cacheDirectory;
  if (!cacheRoot) {
    throw new Error('SCRIPT_UPLOAD_NETWORK: cache directory unavailable');
  }
  const dest = `${cacheRoot}script-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    await FileSystem.copyAsync({ from: localUri, to: dest });
  } catch (e) {
    wrapScriptUploadNetworkError(e);
  }
  return dest;
}

async function postScriptMultipartNative(
  base: string,
  auth: string,
  projectId: string,
  localUri: string,
  mimeType: string,
): Promise<{ status: number; bodyText: string }> {
  const url = `${base}/v1/projects/${projectId}/scripts`;
  try {
    const result = await FileSystem.uploadAsync(url, localUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
    });
    return { status: result.status, bodyText: result.body };
  } catch (e) {
    wrapScriptUploadNetworkError(e);
  }
}

export async function uploadScriptForProject(
  projectId: string,
  localUri: string,
  fileName: string,
  mimeType: string,
): Promise<ScriptArtifactDto> {
  const db = openAssistantDatabase();
  await ensureApiUser(db);
  const base = getApiBaseUrl();
  const auth = authorizationHeader(db);
  if (!base || !auth) {
    if (!base) {
      throw new Error('API is not configured. Set EXPO_PUBLIC_API_BASE_URL to upload.');
    }
    throw new Error('AUTH_REQUIRED_FOR_UPLOAD');
  }

  const uploadUri = await resolveUploadableFileUri(localUri);

  try {
    await flushOutbox(db);
  } catch {
    // outbox sync is best-effort; upload should still run
  }

  let scriptStatus: number;
  let scriptBodyText: string;
  try {
    const r1 = await postScriptMultipartNative(base, auth, projectId, uploadUri, mimeType);
    scriptStatus = r1.status;
    scriptBodyText = r1.bodyText;
  } catch (e) {
    wrapScriptUploadNetworkError(e);
  }

  if (scriptStatus === 404) {
    const errText = scriptBodyText;
    if (!errText.includes('Project not found')) {
      throw new Error(errText || 'Upload failed');
    }
    const local = getLocalProjectForServerEnsure(db, projectId);
    if (!local) {
      throw new Error(errText || 'Upload failed');
    }
    let createRes: Response;
    try {
      createRes = await fetch(`${base}/v1/projects`, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          id: projectId,
          title: local.title,
          description: local.description,
        }),
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`CREATE_PROJECT_NETWORK: ${detail}`);
    }
    if (!createRes.ok && createRes.status !== 409) {
      const createText = await createRes.text();
      throw new Error(createText || 'Could not create project on server');
    }
    try {
      const r2 = await postScriptMultipartNative(base, auth, projectId, uploadUri, mimeType);
      scriptStatus = r2.status;
      scriptBodyText = r2.bodyText;
    } catch (e) {
      wrapScriptUploadNetworkError(e);
    }
  }

  if (scriptStatus < 200 || scriptStatus > 299) {
    throw new Error(scriptBodyText || 'Upload failed');
  }
  let art: ScriptArtifactDto;
  try {
    art = JSON.parse(scriptBodyText) as ScriptArtifactDto;
  } catch {
    throw new Error(scriptBodyText || 'Invalid upload response');
  }
  try {
    await cacheScriptDownload(projectId, art, fileName);
  } catch {
    // artifact exists on server; local cache can be retried later
  }
  return art;
}

export async function cacheScriptDownload(
  projectId: string,
  art: ScriptArtifactDto,
  sourceFilename?: string,
): Promise<void> {
  const db = openAssistantDatabase();
  const base = getApiBaseUrl();
  const auth = authorizationHeader(db);
  if (!base || !auth) {
    return;
  }
  const root = FileSystem.documentDirectory ?? '';
  const dir = `${root}scripts`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const dest = `${dir}/${art.id}`;
  const result = await FileSystem.downloadAsync(`${base}/v1/script-artifacts/${art.id}/file`, dest, {
    headers: { Authorization: auth },
  });
  if (result.status !== 200) {
    throw new Error('Download failed');
  }
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO script_cache (project_id, artifact_id, version, content_sha256, mime_type, local_uri, byte_size, updated_at, source_filename)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectId,
    art.id,
    art.version,
    art.content_sha256,
    art.mime_type,
    result.uri,
    art.byte_size,
    now,
    sourceFilename ?? null,
  );
}

export function getScriptCacheRow(projectId: string): {
  artifactId: string;
  mimeType: string;
  localUri: string;
  version: number;
  sourceFilename: string | null;
} | null {
  const db = openAssistantDatabase();
  const row = db.getFirstSync<{
    artifact_id: string;
    mime_type: string;
    local_uri: string;
    version: number;
    source_filename: string | null;
  }>(
    'SELECT artifact_id, mime_type, local_uri, version, source_filename FROM script_cache WHERE project_id = ?',
    projectId,
  );
  if (!row) {
    return null;
  }
  return {
    artifactId: row.artifact_id,
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
