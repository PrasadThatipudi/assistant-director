import type { SQLiteDatabase } from 'expo-sqlite';

export function runMigrations(db: SQLiteDatabase): void {
  let row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version === 0) {
    db.execSync(`
    CREATE TABLE IF NOT EXISTS meta (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      server_version INTEGER NOT NULL DEFAULT 1,
      pending_sync INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      server_version INTEGER NOT NULL DEFAULT 1,
      pending_sync INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY NOT NULL,
      client_op_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      op TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      client_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS script_cache (
      project_id TEXT PRIMARY KEY NOT NULL,
      artifact_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      content_sha256 TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
    db.execSync('PRAGMA user_version = 1;');
    version = 1;
  }

  if (version < 2) {
    const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(script_cache)');
    const hasSourceFilename = columns.some((c) => c.name === 'source_filename');
    if (!hasSourceFilename) {
      db.execSync('ALTER TABLE script_cache ADD COLUMN source_filename TEXT');
    }
    db.execSync('PRAGMA user_version = 2');
  }
}
