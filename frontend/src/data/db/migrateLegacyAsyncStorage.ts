import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';

const LEGACY_STORAGE_KEY = '@assistant-director/projects_payload_v1';

type LegacyPayload = {
  version: 1;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    isArchived: boolean;
    archivedAt: string | null;
  }>;
};

function parseLegacy(raw: string | null): LegacyPayload['projects'] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as LegacyPayload;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.projects)) {
      return [];
    }
    return parsed.projects;
  } catch {
    return [];
  }
}

export async function migrateLegacyFromAsyncStorage(db: SQLiteDatabase, ownerId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const legacy = parseLegacy(raw);
  if (legacy.length === 0) {
    return;
  }
  for (const p of legacy) {
    const exists = db.getFirstSync<{ c: number }>(
      'SELECT COUNT(1) AS c FROM projects WHERE id = ?',
      p.id,
    );
    if (exists && exists.c > 0) {
      continue;
    }
    db.runSync(
      `INSERT OR IGNORE INTO projects (
        id, owner_id, title, description, is_archived, archived_at, created_at, updated_at, server_version, pending_sync, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      p.id,
      ownerId,
      p.title,
      p.description,
      p.isArchived ? 1 : 0,
      p.archivedAt,
      p.createdAt,
      p.updatedAt,
      1,
      1,
    );
  }
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}
