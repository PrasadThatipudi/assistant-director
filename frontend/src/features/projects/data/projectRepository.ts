import type { SQLiteDatabase } from 'expo-sqlite';

import { getStoredUserId } from '../../../data/auth/session';
import { openAssistantDatabase } from '../../../data/db/openDatabase';
import { enqueueProjectUpsert, flushOutbox } from '../../../data/sync/outboxFlush';
import { createId } from '../../../shared/lib/id';
import type { Project, ProjectDraft } from '../domain/project.types';

type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  is_archived: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    isArchived: row.is_archived === 1,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireOwnerId(db: SQLiteDatabase): string {
  const id = getStoredUserId(db);
  console.log('[ProjectRepo] requireOwnerId check:', { hasId: !!id, idPreview: id?.substring(0, 8) + '...' });
  if (!id) {
    console.error('[ProjectRepo] No user ID found in database');
    throw new Error('App bootstrap incomplete: missing api_user_id');
  }
  return id;
}

export function getLocalProjectForServerEnsure(
  db: SQLiteDatabase,
  projectId: string,
): { title: string; description: string } | null {
  const ownerId = requireOwnerId(db);
  const row = db.getFirstSync<{ title: string; description: string }>(
    'SELECT title, description FROM projects WHERE id = ? AND owner_id = ? AND deleted = 0',
    projectId,
    ownerId,
  );
  if (!row) {
    return null;
  }
  return { title: row.title, description: row.description };
}

function buildSyncPayload(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    is_archived: project.isArchived,
    archived_at: project.archivedAt,
    updated_at: project.updatedAt,
  };
}

export class ProjectRepository {
  private writeChain: Promise<void> = Promise.resolve();

  private getDb(): SQLiteDatabase {
    return openAssistantDatabase();
  }

  private async runSerialized<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeChain.then(() => task());
    this.writeChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private scheduleSync(db: SQLiteDatabase): void {
    void flushOutbox(db);
  }

  async listActive(): Promise<Project[]> {
    const db = this.getDb();
    const ownerId = requireOwnerId(db);
    const rows = db.getAllSync<ProjectRow>(
      `SELECT id, owner_id, title, description, is_archived, archived_at, created_at, updated_at
       FROM projects WHERE owner_id = ? AND is_archived = 0 AND deleted = 0
       ORDER BY updated_at DESC`,
      ownerId,
    );
    return rows.map(mapRow);
  }

  async listArchived(): Promise<Project[]> {
    const db = this.getDb();
    const ownerId = requireOwnerId(db);
    const rows = db.getAllSync<ProjectRow>(
      `SELECT id, owner_id, title, description, is_archived, archived_at, created_at, updated_at
       FROM projects WHERE owner_id = ? AND is_archived = 1 AND deleted = 0
       ORDER BY archived_at DESC, updated_at DESC`,
      ownerId,
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<Project | null> {
    const db = this.getDb();
    const ownerId = requireOwnerId(db);
    const row = db.getFirstSync<ProjectRow>(
      `SELECT id, owner_id, title, description, is_archived, archived_at, created_at, updated_at
       FROM projects WHERE id = ? AND owner_id = ? AND deleted = 0`,
      id,
      ownerId,
    );
    return row ? mapRow(row) : null;
  }

  async create(draft: ProjectDraft): Promise<Project> {
    console.log('[ProjectRepo] Creating project:', { title: draft.title.substring(0, 30), descriptionLength: draft.description.length });
    return this.runSerialized(async () => {
      const db = this.getDb();
      console.log('[ProjectRepo] Database connection obtained');

      const ownerId = requireOwnerId(db);
      console.log('[ProjectRepo] Owner ID verified');

      const now = new Date().toISOString();
      const id = createId();
      const project: Project = {
        id,
        ownerId,
        title: draft.title,
        description: draft.description,
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        archivedAt: null,
      };

      console.log('[ProjectRepo] Project object created:', { id: id.substring(0, 8) + '...', ownerId: ownerId.substring(0, 8) + '...' });

      try {
        db.runSync(
          `INSERT INTO projects (id, owner_id, title, description, is_archived, archived_at, created_at, updated_at, server_version, pending_sync, deleted)
           VALUES (?, ?, ?, ?, 0, NULL, ?, ?, 1, 1, 0)`,
          project.id,
          project.ownerId,
          project.title,
          project.description,
          project.createdAt,
          project.updatedAt,
        );
        console.log('[ProjectRepo] Database INSERT successful');
      } catch (dbError) {
        console.error('[ProjectRepo] Database INSERT failed:', dbError);
        throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }

      try {
        enqueueProjectUpsert(db, project.id, buildSyncPayload(project), project.updatedAt);
        console.log('[ProjectRepo] Sync enqueue successful');
      } catch (syncError) {
        console.error('[ProjectRepo] Sync enqueue failed:', syncError);
        // Don't throw here as the project was created successfully
      }

      this.scheduleSync(db);
      console.log('[ProjectRepo] Project creation completed successfully');
      return project;
    });
  }

  async update(id: string, draft: ProjectDraft): Promise<Project | null> {
    return this.runSerialized(async () => {
      const db = this.getDb();
      const ownerId = requireOwnerId(db);
      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }
      const now = new Date().toISOString();
      const next: Project = {
        ...existing,
        title: draft.title,
        description: draft.description,
        updatedAt: now,
      };
      db.runSync(
        `UPDATE projects SET title = ?, description = ?, updated_at = ?, pending_sync = 1 WHERE id = ? AND owner_id = ?`,
        next.title,
        next.description,
        next.updatedAt,
        id,
        ownerId,
      );
      enqueueProjectUpsert(db, next.id, buildSyncPayload(next), next.updatedAt);
      this.scheduleSync(db);
      return next;
    });
  }

  async archive(id: string): Promise<Project | null> {
    return this.runSerialized(async () => {
      const db = this.getDb();
      const ownerId = requireOwnerId(db);
      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }
      if (existing.isArchived) {
        return existing;
      }
      const now = new Date().toISOString();
      const next: Project = {
        ...existing,
        isArchived: true,
        archivedAt: now,
        updatedAt: now,
      };
      db.runSync(
        `UPDATE projects SET is_archived = 1, archived_at = ?, updated_at = ?, pending_sync = 1 WHERE id = ? AND owner_id = ?`,
        next.archivedAt,
        next.updatedAt,
        id,
        ownerId,
      );
      enqueueProjectUpsert(db, next.id, buildSyncPayload(next), next.updatedAt);
      this.scheduleSync(db);
      return next;
    });
  }

  async unarchive(id: string): Promise<Project | null> {
    return this.runSerialized(async () => {
      const db = this.getDb();
      const ownerId = requireOwnerId(db);
      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }
      if (!existing.isArchived) {
        return existing;
      }
      const now = new Date().toISOString();
      const next: Project = {
        ...existing,
        isArchived: false,
        archivedAt: null,
        updatedAt: now,
      };
      db.runSync(
        `UPDATE projects SET is_archived = 0, archived_at = NULL, updated_at = ?, pending_sync = 1 WHERE id = ? AND owner_id = ?`,
        next.updatedAt,
        id,
        ownerId,
      );
      enqueueProjectUpsert(db, next.id, buildSyncPayload(next), next.updatedAt);
      this.scheduleSync(db);
      return next;
    });
  }
}

export const projectRepository = new ProjectRepository();
