import path from 'path';
import fs from 'fs';
import os from 'os';
import unzipper from 'unzipper';
const Seven = require('node-7z');
const sevenBin = require('7zip-bin');

type ArchiveEntry = { name: string; size?: number; isDirectory?: boolean; raw?: any };

export async function listArchive(filePath: string): Promise<ArchiveEntry[]> {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('file not found: ' + String(filePath));
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.zip') {
    const dir = await unzipper.Open.file(filePath);
    return dir.files.map(f => ({
      name: f.path,
      size: (f.uncompressedSize as number) || undefined,
      isDirectory: f.type === 'Directory',
    }));
  }
  if (ext === '.7z' || ext === '.rar' || ext === '.001') {
    return await new Promise<ArchiveEntry[]>((resolve, reject) => {
      const entries: ArchiveEntry[] = [];
      // node-7z の list を使用（7za が必要、7zip-bin を利用してバイナリを指定）
      const stream = Seven.list(filePath, { $bin: sevenBin.path7za });
      stream.on('data', (data: any) => {
        // data の構造は OS/7z のバージョンで変わるため生データも保持
        entries.push({
          name: data.file ?? data.Name ?? data.Path ?? data,
          size: typeof data.size === 'number' ? data.size : undefined,
          isDirectory: !!(data.attributes && String(data.attributes).includes('D')),
          raw: data,
        });
      });
      stream.on('end', () => resolve(entries));
      stream.on('error', (err: any) => reject(err));
    });
  }
  throw new Error('unsupported archive type: ' + ext);
}

export async function extractArchive(
  filePath: string,
  destDir?: string
): Promise<{ ok: boolean; path?: string; error?: any }> {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: 'file not found' };
  }
  const ext = path.extname(filePath).toLowerCase();
  const out = destDir ?? path.join(os.tmpdir(), `gentleviewer-extract-${Date.now()}`);
  fs.mkdirSync(out, { recursive: true });

  if (ext === '.zip') {
    return new Promise(resolve => {
      fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: out }))
        .on('close', () => resolve({ ok: true, path: out }))
        .on('error', (e: any) => resolve({ ok: false, error: String(e) }));
    });
  }

  if (ext === '.7z' || ext === '.rar' || ext === '.001') {
    return new Promise((resolve, reject) => {
      const stream = Seven.extractFull(filePath, out, { $bin: sevenBin.path7za });
      stream.on('end', () => resolve({ ok: true, path: out }));
      stream.on('error', (e: any) => resolve({ ok: false, error: String(e) }));
    });
  }

  return { ok: false, error: 'unsupported archive type: ' + ext };
}

export async function extractEntry(
  filePath: string,
  entryName: string,
  destDir?: string
): Promise<{ ok: boolean; path?: string; error?: any }> {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: 'file not found' };
  }
  const out = destDir ?? path.join(os.tmpdir(), `gentleviewer-extract-${Date.now()}`);
  fs.mkdirSync(out, { recursive: true });

  const ext = path.extname(filePath).toLowerCase();

  // For zip we can extract single entry via unzipper
  if (ext === '.zip') {
    try {
      const dir = await unzipper.Open.file(filePath);
      const fileEntry = dir.files.find(f => f.path === entryName);
      if (!fileEntry) return { ok: false, error: 'entry not found' };
      const targetPath = path.join(out, entryName);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      await new Promise<void>((resolve, reject) => {
        fileEntry
          .stream()
          .pipe(fs.createWriteStream(targetPath))
          .on('finish', () => resolve())
          .on('error', (e: any) => reject(e));
      });
      return { ok: true, path: targetPath };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // For 7z/rar: extract whole archive to temp (node-7z doesn't always guarantee single-file extract portability), then return path
  if (ext === '.7z' || ext === '.rar' || ext === '.001') {
    try {
      const res = await extractArchive(filePath, out);
      if (!res.ok) return res;
      const candidate = path.join(res.path as string, entryName);
      const resolved = path.resolve(candidate);
      // path traversal check
      if (!resolved.startsWith(path.resolve(res.path as string))) {
        return { ok: false, error: 'path traversal detected' };
      }
      if (!fs.existsSync(resolved)) {
        return { ok: false, error: 'entry not found after extract' };
      }
      return { ok: true, path: resolved };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  return { ok: false, error: 'unsupported archive type: ' + ext };
}
