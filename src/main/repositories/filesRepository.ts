import crypto from 'crypto';
import { initDb } from '../services/db';

type DB = ReturnType<typeof initDb>;
const db = (): DB => initDb();

export type FileRecord = {
  id: string;
  path: string;
  name: string;
  extension?: string | null;
  type?: string | null;
  size?: number | null;
  created_at?: number | null;
  updated_at?: number | null;
};

export function getFileByPath(pathStr: string): FileRecord | undefined {
  return db().prepare(`SELECT * FROM files WHERE path = ?`).get(pathStr) as FileRecord | undefined;
}

export function getFileById(id: string): FileRecord | undefined {
  return db().prepare(`SELECT * FROM files WHERE id = ?`).get(id) as FileRecord | undefined;
}

export function upsertFile(
  record: Omit<FileRecord, 'created_at' | 'updated_at' | 'id'> & { id?: string }
) {
  const now = Date.now();
  // try update by path first
  const existing = getFileByPath(record.path);
  if (existing) {
    db()
      .prepare(
        `UPDATE files SET name = ?, extension = ?, type = ?, size = ?, updated_at = ? WHERE path = ?`
      )
      .run(
        record.name,
        record.extension ?? null,
        record.type ?? null,
        record.size ?? null,
        now,
        record.path
      );
    // ensure FTS updated
    const id = existing.id;
    const row = db().prepare(`SELECT rowid FROM files WHERE id = ?`).get(id) as
      | { rowid?: number }
      | undefined;
    if (row && row.rowid) {
      db()
        .prepare(`INSERT OR REPLACE INTO files_fts(rowid, path, name) VALUES (?, ?, ?)`)
        .run(row.rowid, record.path, record.name);
    }
    return getFileById(existing.id)!;
  }
  const id = record.id ?? crypto.randomUUID();
  const extension = record.name.includes('.')
    ? record.name.slice(record.name.lastIndexOf('.')).toLowerCase()
    : null;
  db()
    .prepare(
      `INSERT INTO files (id, path, name, extension, type, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      record.path,
      record.name,
      extension,
      record.type ?? null,
      record.size ?? null,
      now,
      now
    );

  // update FTS index for the new row
  const row = db().prepare(`SELECT rowid FROM files WHERE id = ?`).get(id) as
    | { rowid?: number }
    | undefined;
  if (row && row.rowid) {
    db()
      .prepare(`INSERT OR REPLACE INTO files_fts(rowid, path, name) VALUES (?, ?, ?)`)
      .run(row.rowid, record.path, record.name);
  }

  return getFileById(id)!;
}

export function deleteFile(id: string) {
  return db().prepare(`DELETE FROM files WHERE id = ?`).run(id);
}

export function listFiles(limit = 100, offset = 0) {
  return db()
    .prepare(`SELECT * FROM files ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as FileRecord[];
}
