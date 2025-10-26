import fs from 'fs';
import path from 'path';
import os from 'os';
import { Dirent } from 'fs';

export type CachePolicy = {
  maxSizeBytes: number; // 上限バイト
  ttlSeconds: number; // 経過秒で削除
};

const POLICY_FILE = 'cache-policy.json';
const DEFAULT_POLICY: CachePolicy = { maxSizeBytes: 200 * 1024 * 1024, ttlSeconds: 30 * 24 * 3600 }; // 200MB / 30日

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function cacheDirFor(userDataPath: string) {
  return path.join(userDataPath, 'cache');
}

export function loadPolicy(userDataPath: string): CachePolicy {
  try {
    const p = path.join(userDataPath, POLICY_FILE);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      return { ...DEFAULT_POLICY, ...(JSON.parse(raw) || {}) };
    }
  } catch {}
  return DEFAULT_POLICY;
}

export function savePolicy(userDataPath: string, policy: CachePolicy) {
  try {
    fs.writeFileSync(path.join(userDataPath, POLICY_FILE), JSON.stringify(policy, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('savePolicy error', e);
    return false;
  }
}

export async function getCacheInfo(userDataPath: string) {
  const dir = cacheDirFor(userDataPath);
  ensureDir(dir);
  const files: { path: string; size: number; mtimeMs: number }[] = [];
  const walkSync = (d: string) => {
    for (const name of fs.readdirSync(d)) {
      const fp = path.join(d, name);
      const st = fs.statSync(fp);
      if (st.isDirectory()) {
        walkSync(fp);
      } else {
        files.push({ path: fp, size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  };
  try {
    walkSync(dir);
  } catch (e) {
    // ignore
  }
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const policy = loadPolicy(userDataPath);
  return { dir, totalSize, fileCount: files.length, files, policy };
}

export async function clearCache(userDataPath: string) {
  const dir = cacheDirFor(userDataPath);
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    ensureDir(dir);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

type ProgressPayload = {
  phase: 'scan' | 'ttl' | 'size' | 'done' | 'error';
  totalFiles?: number;
  scannedFiles?: number;
  totalBytes?: number;
  removedFiles?: number;
  removedBytes?: number;
  remainingBytes?: number;
  currentFile?: string | null;
  message?: string;
};

export async function pruneCache(
  userDataPath: string,
  opt?: { force?: boolean },
  onProgress?: (p: ProgressPayload) => void
): Promise<{ ok: boolean; totalRemainingBytes?: number; error?: any }> {
  const dir = cacheDirFor(userDataPath);
  ensureDir(dir);
  const policy = loadPolicy(userDataPath);
  const now = Date.now();

  // async walk to collect metadata (no file content read)
  const files: { path: string; size: number; mtimeMs: number }[] = [];
  let scanned = 0;
  const readdir = async (d: string) => {
    let entries: Dirent[];
    try {
      entries = await fs.promises.readdir(d, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const ent of entries) {
      const fp = path.join(d, ent.name);
      if (ent.isDirectory()) {
        await readdir(fp);
      } else if (ent.isFile()) {
        try {
          const st = await fs.promises.stat(fp);
          files.push({ path: fp, size: st.size, mtimeMs: st.mtimeMs });
        } catch {}
      }
      scanned++;
      if (onProgress && scanned % 100 === 0) {
        onProgress({
          phase: 'scan',
          scannedFiles: scanned,
          totalFiles: undefined,
          totalBytes: undefined,
          currentFile: fp,
        });
      }
    }
  };

  try {
    await readdir(dir);
    onProgress?.({
      phase: 'scan',
      scannedFiles: scanned,
      totalFiles: files.length,
      totalBytes: files.reduce((s, f) => s + f.size, 0),
    });
  } catch (e) {
    onProgress?.({ phase: 'error', message: String(e) });
    return { ok: false, error: String(e) };
  }

  // TTL deletion (stream deletion)
  let removedFiles = 0;
  let removedBytes = 0;
  const ttlCut = policy.ttlSeconds * 1000;
  for (const f of files) {
    if (now - f.mtimeMs > ttlCut) {
      try {
        onProgress?.({ phase: 'ttl', currentFile: f.path });
        await fs.promises.unlink(f.path);
        removedFiles++;
        removedBytes += f.size;
      } catch (e) {
        // ignore single errors
        onProgress?.({ phase: 'ttl', message: `skip ${f.path}: ${String(e)}` });
      }
    }
  }
  onProgress?.({ phase: 'ttl', removedFiles, removedBytes });

  // refresh remaining list
  const remaining: { path: string; size: number; mtimeMs: number }[] = [];
  const readdir2 = async (d: string) => {
    let entries: Dirent[];
    try {
      entries = await fs.promises.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const fp = path.join(d, ent.name);
      if (ent.isDirectory()) {
        await readdir2(fp);
      } else if (ent.isFile()) {
        try {
          const st = await fs.promises.stat(fp);
          remaining.push({ path: fp, size: st.size, mtimeMs: st.mtimeMs });
        } catch {}
      }
    }
  };
  await readdir2(dir);
  let total = remaining.reduce((s, f) => s + f.size, 0);
  onProgress?.({ phase: 'size', totalBytes: total });

  // Size-based pruning
  if (policy.maxSizeBytes > 0 && total > policy.maxSizeBytes) {
    // sort by oldest first
    remaining.sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const f of remaining) {
      if (total <= policy.maxSizeBytes) break;
      try {
        onProgress?.({
          phase: 'size',
          currentFile: f.path,
          removedFiles,
          removedBytes,
          remainingBytes: total,
        });
        await fs.promises.unlink(f.path);
        total -= f.size;
        removedFiles++;
        removedBytes += f.size;
      } catch (e) {
        onProgress?.({ phase: 'size', message: `skip ${f.path}: ${String(e)}` });
      }
    }
  }

  onProgress?.({ phase: 'done', removedFiles, removedBytes, remainingBytes: total });
  return { ok: true, totalRemainingBytes: total };
}
