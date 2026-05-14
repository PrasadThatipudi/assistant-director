import type { SQLiteDatabase } from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';

import { authorizationHeader } from '../auth/session';
import { getApiBaseUrl } from '../../shared/lib/env';

type SyncPushResponse = {
  results: Array<{
    client_op_id: string;
    status: 'accepted' | 'rejected' | 'conflict';
    detail?: string;
    server_payload?: Record<string, unknown>;
  }>;
};

function rowToProjectUpdate(db: SQLiteDatabase, payload: Record<string, unknown>): void {
  const id = String(payload.id ?? '');
  if (!id) {
    return;
  }
  db.runSync(
    `UPDATE projects SET
      title = ?,
      description = ?,
      is_archived = ?,
      archived_at = ?,
      updated_at = ?,
      server_version = ?,
      pending_sync = 0
    WHERE id = ?`,
    String(payload.title ?? ''),
    String(payload.description ?? ''),
    Boolean(payload.is_archived) ? 1 : 0,
    payload.archived_at == null ? null : String(payload.archived_at),
    String(payload.updated_at ?? ''),
    Number(payload.version ?? 1),
    id,
  );
}

export async function flushOutbox(db: SQLiteDatabase): Promise<void> {
  const base = getApiBaseUrl();
  const auth = authorizationHeader(db);
  if (!base || !auth) {
    return;
  }
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return;
  }
  const rows = db.getAllSync<{
    id: string;
    client_op_id: string;
    entity_type: string;
    entity_id: string;
    op: string;
    payload_json: string;
    client_updated_at: string;
  }>('SELECT id, client_op_id, entity_type, entity_id, op, payload_json, client_updated_at FROM outbox ORDER BY created_at ASC LIMIT 100');
  if (rows.length === 0) {
    return;
  }
  const operations = rows.map((r) => ({
    client_op_id: r.client_op_id,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    op: r.op,
    payload: r.payload_json ? (JSON.parse(r.payload_json) as Record<string, unknown>) : null,
    client_updated_at: r.client_updated_at,
  }));
  const res = await fetch(`${base}/v1/sync/push`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ operations }),
  });
  if (!res.ok) {
    return;
  }
  const body = (await res.json()) as SyncPushResponse;
  const byClientId = new Map(body.results.map((x) => [x.client_op_id, x]));
  for (const row of rows) {
    const outcome = byClientId.get(row.client_op_id);
    if (!outcome) {
      continue;
    }
    if (outcome.status === 'accepted' || outcome.status === 'rejected') {
      db.runSync('DELETE FROM outbox WHERE id = ?', row.id);
    }
    if (outcome.status === 'conflict' && outcome.server_payload && row.entity_type === 'project') {
      rowToProjectUpdate(db, outcome.server_payload);
      db.runSync('DELETE FROM outbox WHERE id = ?', row.id);
    }
  }
}

export function enqueueProjectUpsert(
  db: SQLiteDatabase,
  projectId: string,
  payload: Record<string, unknown>,
  clientUpdatedAt: string,
): void {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clientOpId = id;
  db.runSync(
    `INSERT INTO outbox (id, client_op_id, entity_type, entity_id, op, payload_json, client_updated_at, created_at)
     VALUES (?, ?, 'project', ?, 'upsert', ?, ?, ?)`,
    id,
    clientOpId,
    projectId,
    JSON.stringify(payload),
    clientUpdatedAt,
    clientUpdatedAt,
  );
}

export function enqueueProjectDelete(db: SQLiteDatabase, projectId: string, clientUpdatedAt: string): void {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  db.runSync(
    `INSERT INTO outbox (id, client_op_id, entity_type, entity_id, op, payload_json, client_updated_at, created_at)
     VALUES (?, ?, 'project', ?, 'delete', '{}', ?, ?)`,
    id,
    id,
    projectId,
    clientUpdatedAt,
    clientUpdatedAt,
  );
}
