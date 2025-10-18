import { initDb } from '../services/db';
import crypto from 'crypto';

export type Tag = { id: string; name: string; color?: string; created_at?: number };

const db = () => initDb();

export function createTag(name: string, color?: string) {
  const id = crypto.randomUUID();
  const now = Date.now();
  db()
    .prepare(`INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, name, color ?? null, now);
  return getTagById(id)!;
}

export function getTagById(id: string): Tag | undefined {
  return db().prepare(`SELECT * FROM tags WHERE id = ?`).get(id) as Tag | undefined;
}

export function listTags(): Tag[] {
  return db().prepare(`SELECT * FROM tags ORDER BY name ASC`).all() as Tag[];
}

export function deleteTag(id: string) {
  return db().prepare(`DELETE FROM tags WHERE id = ?`).run(id);
}

export function addTagToFile(fileId: string, tagId: string) {
  return db()
    .prepare(`INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)`)
    .run(fileId, tagId);
}

export function removeTagFromFile(fileId: string, tagId: string) {
  return db().prepare(`DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?`).run(fileId, tagId);
}

export function listTagsForFile(fileId: string) {
  return db()
    .prepare(
      `SELECT t.* FROM tags t INNER JOIN file_tags ft ON t.id = ft.tag_id WHERE ft.file_id = ?`
    )
    .all(fileId) as Tag[];
}
