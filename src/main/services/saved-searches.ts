import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { SavedSearch } from '../../shared/types/thumbnail';

const FILE = path.join(app.getPath('userData'), 'saved-searches.json');

async function loadAll(): Promise<SavedSearch[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as SavedSearch[];
    return parsed;
  } catch {
    return [];
  }
}

async function saveAll(list: SavedSearch[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), 'utf8');
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  return loadAll();
}

export async function saveSavedSearch(search: SavedSearch): Promise<void> {
  const list = await loadAll();
  list.push(search);
  await saveAll(list);
}

export async function updateSearchExecutionCount(id: string): Promise<void> {
  const list = await loadAll();
  const idx = list.findIndex(s => s.id === id);
  if (idx >= 0) {
    list[idx].executionCount = (list[idx].executionCount || 0) + 1;
    list[idx].lastExecuted = new Date().toISOString();
    await saveAll(list);
  }
}