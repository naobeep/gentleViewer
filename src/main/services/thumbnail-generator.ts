import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { app } from 'electron';
import type { ThumbnailGenerationProgress, ThumbnailError } from '../../shared/types/thumbnail';

// 公開ユーティリティ: 指定ファイルに対応するキャッシュパスを返す（存在チェック含む）
export async function getCachedThumbnailPathFor(filePath: string): Promise<string | null> {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'thumbnail-cache');
    await fs.promises.mkdir(cacheDir, { recursive: true });
    const mappingFile = path.join(cacheDir, 'mapping.json');

    // Normalize path: try realpath, fallback to resolved input
    let realP: string;
    try {
      realP = await fs.promises.realpath(filePath);
    } catch {
      realP = path.resolve(filePath);
    }

    // try to stat the resolved path
    let stat: fs.Stats | null = null;
    try {
      stat = await fs.promises.stat(realP);
    } catch {
      stat = null;
    }

    const tryExists = async (candidate: string) =>
      fs.promises
        .access(candidate, fs.constants.R_OK)
        .then(() => true)
        .catch(() => false);

    // 1) check mapping.json first (fast, authoritative once generator ran)
    try {
      const raw = await fs.promises.readFile(mappingFile, 'utf8').catch(() => '');
      if (raw) {
        const map = JSON.parse(raw) as Record<string, string>;
        const candidatesFromMap = [realP, filePath, realP.toLowerCase()].filter(Boolean);
        for (const key of candidatesFromMap) {
          const mapped = map[key];
          if (mapped) {
            const p = path.join(cacheDir, mapped);
            if (await tryExists(p)) return p;
          }
        }
      }
    } catch {
      // ignore parse/read errors and continue to heuristics
    }

    // fallback heuristics (try several hash variants)
    const candidates: string[] = [];
    const h1 = crypto.createHash('sha1');
    h1.update(realP);
    if (stat?.mtimeMs) h1.update(String(stat.mtimeMs));
    candidates.push(path.join(cacheDir, `${h1.digest('hex')}.jpg`));
    const h2 = crypto.createHash('sha1').update(realP).digest('hex');
    candidates.push(path.join(cacheDir, `${h2}.jpg`));
    if (filePath !== realP) {
      const h3 = crypto
        .createHash('sha1')
        .update(filePath + (stat?.mtimeMs ? String(stat.mtimeMs) : ''))
        .digest('hex');
      candidates.push(path.join(cacheDir, `${h3}.jpg`));
      const h4 = crypto.createHash('sha1').update(filePath).digest('hex');
      candidates.push(path.join(cacheDir, `${h4}.jpg`));
    }
    if (process.platform === 'win32') {
      const lower = realP.toLowerCase();
      const hl = crypto
        .createHash('sha1')
        .update(lower + (stat?.mtimeMs ? String(stat.mtimeMs) : ''))
        .digest('hex');
      candidates.push(path.join(cacheDir, `${hl}.jpg`));
      const hl2 = crypto.createHash('sha1').update(lower).digest('hex');
      candidates.push(path.join(cacheDir, `${hl2}.jpg`));
    }

    for (const c of candidates) {
      if (!c) continue;
      if (await tryExists(c)) return c;
    }

    return null;
  } catch {
    return null;
  }
}

export class ThumbnailGenerator extends EventEmitter {
  private _isPaused = false;
  private _isCancelled = false;
  private _concurrency = 2;

  constructor(concurrency = 2) {
    super();
    this._concurrency = concurrency;
  }

  private async ensureCacheDir() {
    const cacheDir = path.join(app.getPath('userData'), 'thumbnail-cache');
    await fs.promises.mkdir(cacheDir, { recursive: true });
    return cacheDir;
  }

  private async hashFor(filePath: string, mtimeMs?: number) {
    const h = crypto.createHash('sha1');
    h.update(filePath);
    if (mtimeMs) h.update(String(mtimeMs));
    return h.digest('hex');
  }

  async generateThumbnails(filePaths: string[]) {
    this._isCancelled = false;
    this._isPaused = false;

    const cacheDir = await this.ensureCacheDir();
    const total = filePaths.length || 0;
    let completed = 0;
    let skipped = 0;
    let errors = 0;

    const queue = filePaths.slice();

    const worker = async () => {
      while (queue.length > 0) {
        if (this._isCancelled) return;
        if (this._isPaused) {
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        const file = queue.shift()!;
        try {
          let stat: fs.Stats | null = null;
          try {
            stat = await fs.promises.stat(file);
          } catch {
            stat = null;
          }

          const hash = await this.hashFor(file, stat?.mtimeMs);
          const outPath = path.join(cacheDir, `${hash}.jpg`);

          // if cached and exists, skip regen
          const exists = await fs.promises
            .access(outPath, fs.constants.R_OK)
            .then(() => true)
            .catch(() => false);

          if (!exists) {
            // generate thumbnail -> width 400 (PoC)
            await sharp(file)
              .resize({ width: 400, withoutEnlargement: true })
              .jpeg({ quality: 78 })
              .toFile(outPath);
            // update mapping.json
            try {
              const mappingFile = path.join(cacheDir, 'mapping.json');
              const realP = await fs.promises.realpath(file).catch(() => path.resolve(file));
              const raw = await fs.promises.readFile(mappingFile, 'utf8').catch(() => '{}');
              const map = raw ? JSON.parse(raw) : {};
              map[realP] = path.basename(outPath);
              map[file] = path.basename(outPath);
              if (process.platform === 'win32') map[realP.toLowerCase()] = path.basename(outPath);
              await fs.promises.writeFile(mappingFile, JSON.stringify(map), 'utf8').catch(() => {});
            } catch {
              /* ignore mapping write errors */
            }
          } else {
            skipped++;
            // ensure mapping exists even if cache already existed
            try {
              const mappingFile = path.join(cacheDir, 'mapping.json');
              const realP = await fs.promises.realpath(file).catch(() => path.resolve(file));
              const raw = await fs.promises.readFile(mappingFile, 'utf8').catch(() => '{}');
              const map = raw ? JSON.parse(raw) : {};
              const bn = path.basename(outPath);
              if (map[realP] !== bn) {
                map[realP] = bn;
                map[file] = bn;
                if (process.platform === 'win32') map[realP.toLowerCase()] = bn;
                await fs.promises
                  .writeFile(mappingFile, JSON.stringify(map), 'utf8')
                  .catch(() => {});
              }
            } catch {
              /* ignore mapping write errors */
            }
          }

          completed++;
          const progress: ThumbnailGenerationProgress = {
            status: queue.length === 0 ? 'completed' : 'running',
            total,
            completed,
            skipped,
            errors,
            currentFile: file,
            startedAt: Date.now(),
            updatedAt: Date.now(),
          };
          this.emit('progress', progress);
        } catch (e) {
          errors++;
          const err: ThumbnailError = {
            filePath: file,
            error: e instanceof Error ? e.message : String(e),
            timestamp: Date.now(),
          };
          this.emit('error', err);
        }
      }
    };

    // start workers
    const workers = [];
    const n = Math.max(1, Math.min(this._concurrency, filePaths.length));
    for (let i = 0; i < n; i++) workers.push(worker());
    await Promise.all(workers);

    // final progress emit
    this.emit('progress', {
      status: this._isCancelled ? 'idle' : 'completed',
      total,
      completed,
      skipped,
      errors,
      updatedAt: Date.now(),
    } as ThumbnailGenerationProgress);
  }

  pause() {
    this._isPaused = true;
    this.emit('progress', {
      status: 'paused',
      total: 0,
      completed: 0,
      skipped: 0,
      errors: 0,
    } as ThumbnailGenerationProgress);
  }
  resume() {
    this._isPaused = false;
    this.emit('progress', {
      status: 'running',
      total: 0,
      completed: 0,
      skipped: 0,
      errors: 0,
    } as ThumbnailGenerationProgress);
  }
  cancel() {
    this._isCancelled = true;
    this.emit('progress', {
      status: 'idle',
      total: 0,
      completed: 0,
      skipped: 0,
      errors: 0,
    } as ThumbnailGenerationProgress);
  }
}

export const thumbnailGenerator = new ThumbnailGenerator(2);
