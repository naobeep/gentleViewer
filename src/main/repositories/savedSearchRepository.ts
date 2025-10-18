import { initDb } from '../services/db';
import crypto from 'crypto';
import type { SavedSearch } from '../../shared/types/thumbnail';

const db = () => initDb();

export function createSavedSearch(
  s: Omit<SavedSearch, 'id' | 'createdAt' | 'lastExecuted' | 'executionCount'>
) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const stmt = db().prepare(
    `INSERT INTO saved_searches (id, name, icon, query, is_favorite, is_pinned, execution_count, created_at, last_executed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    id,
    s.name,
    s.icon ?? null,
    JSON.stringify(s.query ?? null),
    s.isFavorite ? 1 : 0,
    s.isPinned ? 1 : 0,
    0,
    now,
    null
  );
  return getSavedSearchById(id)!;
}

export function getSavedSearchById(id: string): SavedSearch | undefined {
  const row: any = db().prepare(`SELECT * FROM saved_searches WHERE id = ?`).get(id);
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    query: row.query ? JSON.parse(row.query) : undefined,
    isFavorite: !!row.is_favorite,
    isPinned: !!row.is_pinned,
    executionCount: row.execution_count,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    lastExecuted: row.last_executed ? new Date(row.last_executed).toISOString() : null,
  } as SavedSearch;
}

export function listSavedSearches(): SavedSearch[] {
  const rows = db()
    .prepare(
      `SELECT * FROM saved_searches ORDER BY is_pinned DESC, execution_count DESC, created_at DESC`
    )
    .all();
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    query: row.query ? JSON.parse(row.query) : undefined,
    isFavorite: !!row.is_favorite,
    isPinned: !!row.is_pinned,
    executionCount: row.execution_count,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    lastExecuted: row.last_executed ? new Date(row.last_executed).toISOString() : null,
  }));
}

export function updateSavedSearch(id: string, patch: Partial<SavedSearch>) {
  const current = getSavedSearchById(id);
  if (!current) return undefined;
  const updated = {
    ...current,
    ...patch,
  };
  db()
    .prepare(
      `UPDATE saved_searches SET name = ?, icon = ?, query = ?, is_favorite = ?, is_pinned = ?, last_executed = ? WHERE id = ?`
    )
    .run(
      updated.name,
      updated.icon ?? null,
      updated.query ? JSON.stringify(updated.query) : null,
      updated.isFavorite ? 1 : 0,
      updated.isPinned ? 1 : 0,
      updated.lastExecuted ? Date.parse(updated.lastExecuted) : null,
      id
    );
  return getSavedSearchById(id);
}

export function deleteSavedSearch(id: string) {
  return db().prepare(`DELETE FROM saved_searches WHERE id = ?`).run(id);
}

export function incrementExecutionCount(id: string) {
  db()
    .prepare(
      `UPDATE saved_searches SET execution_count = execution_count + 1, last_executed = ? WHERE id = ?`
    )
    .run(Date.now(), id);
  return getSavedSearchById(id);
}
