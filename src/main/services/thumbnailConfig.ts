import fs from 'fs';
import path from 'path';

export type ThumbnailConfig = {
  concurrency: number;
};

const DEFAULT: ThumbnailConfig = { concurrency: 4 };
const FILENAME = 'thumbnail-config.json';

export function loadThumbnailConfig(userDataPath: string): ThumbnailConfig {
  try {
    const p = path.join(userDataPath, FILENAME);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT, ...(parsed || {}) };
    }
  } catch (e) {
    console.error('loadThumbnailConfig error', e);
  }
  return DEFAULT;
}

export function saveThumbnailConfig(userDataPath: string, cfg: Partial<ThumbnailConfig>) {
  try {
    const p = path.join(userDataPath, FILENAME);
    const cur = loadThumbnailConfig(userDataPath);
    const next = { ...cur, ...(cfg || {}) };
    fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
    return next;
  } catch (e) {
    console.error('saveThumbnailConfig error', e);
    return loadThumbnailConfig(userDataPath);
  }
}
