import crypto from 'crypto';
import { initDb } from '../services/db';

type DB = ReturnType<typeof initDb>;

const db = (): DB => initDb();

export type Tag = {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  created_at?: number;
  updated_at?: number;
};

export function createTag(name: string, color?: string, description?: string) {
  const id = crypto.randomUUID();
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO tags (id, name, color, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, name, color ?? null, description ?? null, now, now);
  return getTagById(id)!;
}

export function getTagById(id: string): Tag | undefined {
  return db().prepare(`SELECT * FROM tags WHERE id = ?`).get(id) as Tag | undefined;
}

export function listTags(): Tag[] {
  return db().prepare(`SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC`).all() as Tag[];
}

export function deleteTag(id: string) {
  return db().prepare(`DELETE FROM tags WHERE id = ?`).run(id);
}

export function addTagToFile(fileId: string, tagId: string) {
  const id = crypto.randomUUID();
  const now = Date.now();
  return db()
    .prepare(
      `INSERT OR IGNORE INTO file_tags (id, file_id, tag_id, created_at) VALUES (?, ?, ?, ?)`
    )
    .run(id, fileId, tagId, now);
}

export function removeTagFromFile(fileId: string, tagId: string) {
  return db().prepare(`DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?`).run(fileId, tagId);
}

export function listTagsForFile(fileId: string) {
  return db()
    .prepare(
      `SELECT t.* FROM tags t INNER JOIN file_tags ft ON t.id = ft.tag_id WHERE ft.file_id = ? ORDER BY t.name COLLATE NOCASE ASC`
    )
    .all(fileId) as Tag[];
}
