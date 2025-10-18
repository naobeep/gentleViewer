import { initDb } from '../services/db';
import crypto from 'crypto';

export type FileRecord = {
  id: string;
  path: string;
  name: string;
  size?: number | null;
  created_at?: number | null;
  updated_at?: number | null;
};

const db = () => initDb();

export function createFile(record: Omit<FileRecord, 'id' | 'created_at' | 'updated_at'>) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const stmt = db().prepare(
    `INSERT INTO files (id, path, name, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  stmt.run(id, record.path, record.name, record.size ?? null, now, now);
  return getFileById(id)!;
}

export function getFileById(id: string): FileRecord | undefined {
  return db().prepare(`SELECT * FROM files WHERE id = ?`).get(id) as FileRecord | undefined;
}

export function getFileByPath(pathStr: string): FileRecord | undefined {
  return db().prepare(`SELECT * FROM files WHERE path = ?`).get(pathStr) as FileRecord | undefined;
}

export function listFiles(limit = 100, offset = 0): FileRecord[] {
  return db()
    .prepare(`SELECT * FROM files ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as FileRecord[];
}

export function upsertFile(
  record: Omit<FileRecord, 'created_at' | 'updated_at'> & { id?: string }
) {
  const now = Date.now();
  // try update by path first
  const existing = getFileByPath(record.path);
  if (existing) {
    db()
      .prepare(`UPDATE files SET name = ?, size = ?, updated_at = ? WHERE path = ?`)
      .run(record.name, record.size ?? null, now, record.path);
    return getFileById(existing.id)!;
  }
  const id = record.id ?? crypto.randomUUID();
  db()
    .prepare(
      `INSERT INTO files (id, path, name, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, record.path, record.name, record.size ?? null, now, now);
  return getFileById(id)!;
}

export function deleteFile(id: string) {
  return db().prepare(`DELETE FROM files WHERE id = ?`).run(id);
}
