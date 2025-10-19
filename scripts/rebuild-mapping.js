const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (!process.argv[2]) {
  console.error('Usage: node rebuild-mapping.js <filePath>');
  process.exit(2);
}
const file = process.argv[2];
const appData =
  process.env.APPDATA || (process.env.HOME && path.join(process.env.HOME, 'AppData', 'Roaming'));
if (!appData) {
  console.error('APPDATA not found');
  process.exit(2);
}
const cacheDir = path.join(appData, 'gentle-viewer', 'thumbnail-cache');
const mappingFile = path.join(cacheDir, 'mapping.json');

function sha1hex(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

async function run() {
  try {
    if (!fs.existsSync(cacheDir)) {
      console.error('CACHE_NOT_FOUND:', cacheDir);
      process.exit(1);
    }
    if (!fs.existsSync(file)) {
      console.error('SOURCE_FILE_NOT_FOUND:', file);
      process.exit(1);
    }

    const real = await fs.promises.realpath(file).catch(() => path.resolve(file));
    const st = await fs.promises.stat(real).catch(() => null);
    const mtime = st?.mtimeMs;

    const candidates = [];
    const h1 = sha1hex(real + (mtime ? String(mtime) : ''));
    candidates.push(h1);
    const h2 = sha1hex(real);
    candidates.push(h2);
    if (file !== real) {
      candidates.push(sha1hex(file + (mtime ? String(mtime) : '')));
      candidates.push(sha1hex(file));
    }
    if (process.platform === 'win32') {
      const lower = real.toLowerCase();
      candidates.push(sha1hex(lower + (mtime ? String(mtime) : '')));
      candidates.push(sha1hex(lower));
    }

    let found = null;
    for (const h of candidates) {
      const p = path.join(cacheDir, `${h}.jpg`);
      if (fs.existsSync(p)) {
        found = path.basename(p);
        break;
      }
    }

    if (!found) {
      console.error('NO_CACHE_MATCH_FOR', file);
      process.exit(3);
    }

    // backup mapping
    if (fs.existsSync(mappingFile)) {
      await fs.promises.copyFile(mappingFile, mappingFile + '.bak').catch(() => {});
    }

    let map = {};
    try {
      const raw = await fs.promises.readFile(mappingFile, 'utf8').catch(() => '');
      if (raw) map = JSON.parse(raw);
    } catch (e) {
      map = {};
    }

    map[real] = found;
    map[file] = found;
    if (process.platform === 'win32') map[real.toLowerCase()] = found;

    const tmp = mappingFile + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(map, null, 2), 'utf8');
    await fs.promises.rename(tmp, mappingFile);

    console.log('MAPPING_UPDATED:', mappingFile, '->', found);
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(10);
  }
}

run();
