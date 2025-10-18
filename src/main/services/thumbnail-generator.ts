import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import pLimit from 'p-limit';
import { ThumbnailGenerationProgress, ThumbnailError } from '../../shared/types/thumbnail';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ThumbnailGenerator extends EventEmitter {
  private queue: string[] = [];
  private isRunning = false;
  private isPaused = false;
  private limit = pLimit(3);

  private progress: ThumbnailGenerationProgress = {
    total: 0,
    completed: 0,
    skipped: 0,
    errors: 0,
    currentFile: null,
    estimatedTimeRemaining: null,
    status: 'idle',
  };

  async generateThumbnails(filePaths: string[]) {
    if (!filePaths || filePaths.length === 0) return;
    this.queue = [...filePaths];
    this.progress.total = filePaths.length;
    this.progress.completed = 0;
    this.progress.skipped = 0;
    this.progress.errors = 0;
    this.progress.status = 'running';
    this.isRunning = true;

    const startTime = Date.now();

    try {
      const tasks = this.queue.map((filePath) =>
        this.limit(async () => {
          if (!this.isRunning) return;

          while (this.isPaused) {
            await sleep(100);
          }

          this.progress.currentFile = path.basename(filePath);
          this.emitProgress();

          try {
            const exists = await this.checkCachedThumbnail(filePath);
            if (exists) {
              this.progress.skipped++;
            } else {
              await this.generateSingleThumbnail(filePath);
            }
            this.progress.completed++;
          } catch (err) {
            this.progress.errors++;
            const errorObj: ThumbnailError = {
              filePath,
              fileName: path.basename(filePath),
              error: err instanceof Error ? err.message : String(err),
              timestamp: Date.now(),
            };
            this.emit('error', errorObj);
          }

          const elapsed = Date.now() - startTime;
          const rate = elapsed > 0 ? this.progress.completed / elapsed : 0;
          const remaining = this.progress.total - this.progress.completed;
          this.progress.estimatedTimeRemaining = rate > 0 ? Math.ceil((remaining / rate) / 1000) : null;

          this.emitProgress();
        })
      );

      await Promise.all(tasks);

      if (this.isRunning) {
        this.progress.status = 'completed';
        this.progress.currentFile = null;
        this.emitProgress();
        this.isRunning = false;
      }
    } catch (error) {
      this.progress.status = 'error';
      this.emitProgress();
      this.isRunning = false;
    }
  }

  pause() {
    this.isPaused = true;
    this.progress.status = 'paused';
    this.emitProgress();
  }

  resume() {
    this.isPaused = false;
    this.progress.status = 'running';
    this.emitProgress();
  }

  cancel() {
    this.isRunning = false;
    this.queue = [];
    this.progress.status = 'idle';
    this.progress.currentFile = null;
    this.emitProgress();
  }

  private emitProgress() {
    this.emit('progress', { ...this.progress });
  }

  private async generateSingleThumbnail(filePath: string): Promise<void> {
    const thumbsDir = path.join(path.dirname(filePath), '.gentle_thumbs');
    try {
      await fs.mkdir(thumbsDir, { recursive: true });
      await sleep(300 + Math.random() * 700);
      const thumbPath = path.join(thumbsDir, path.basename(filePath) + '.thumb');
      await fs.writeFile(thumbPath, 'thumbnail');
    } catch (e) {
      throw e;
    }
  }

  private async checkCachedThumbnail(filePath: string): Promise<boolean> {
    const thumbsDir = path.join(path.dirname(filePath), '.gentle_thumbs');
    const thumbPath = path.join(thumbsDir, path.basename(filePath) + '.thumb');
    try {
      await fs.access(thumbPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();