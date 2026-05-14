import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'assistant.db';

let dbInstance: SQLiteDatabase | null = null;

export function openAssistantDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = openDatabaseSync(DB_NAME);
    dbInstance.execSync('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}
