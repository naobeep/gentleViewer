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
    let stat: fs.Stats | null = null;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      stat = null;
    }
    const h = crypto.createHash('sha1');
    h.update(filePath);
    if (stat?.mtimeMs) h.update(String(stat.mtimeMs));
    const hash = h.digest('hex');
    const outPath = path.join(cacheDir, `${hash}.jpg`);
    const exists = await fs.promises
      .access(outPath, fs.constants.R_OK)
      .then(() => true)
      .catch(() => false);
    return exists ? outPath : null;
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
          } else {
            skipped++;
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
