const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const appData =
      process.env.APPDATA ||
      (process.env.HOME && path.join(process.env.HOME, 'AppData', 'Roaming'));
    if (!appData) throw new Error('APPDATA not found');
    const cacheDir = path.join(appData, 'gentle-viewer', 'thumbnail-cache');
    const mappingFile = path.join(cacheDir, 'mapping.json');

    if (!fs.existsSync(mappingFile)) {
      console.log('NO_MAPPING_JSON:', mappingFile);
      process.exit(0);
    }

    const raw = await fs.promises.readFile(mappingFile, 'utf8');
    const bak = mappingFile + '.bak.' + Date.now();
    await fs.promises.copyFile(mappingFile, bak);
    console.log('BACKUP_CREATED:', bak);

    // 1) try parse as-is
    try {
      JSON.parse(raw);
      console.log('OK: mapping.json is valid JSON — no change made.');
      process.exit(0);
    } catch {}

    // 2) try trimming at last closing brace
    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace > -1) {
      const trimmed = raw.slice(0, lastBrace + 1);
      try {
        const parsed = JSON.parse(trimmed);
        const tmp = mappingFile + '.tmp';
        await fs.promises.writeFile(tmp, JSON.stringify(parsed, null, 2), 'utf8');
        await fs.promises.rename(tmp, mappingFile);
        console.log('REPAIRED_BY_TRIM: wrote repaired mapping.json');
        process.exit(0);
      } catch (e) {
        // continue to regex fallback
      }
    }

    // 3) fallback: extract "key":"*.jpg" pairs by regex
    const map = {};
    const pairRe = /"([^"]+?)"\s*:\s*"([^"]+?\.jpg)"/g;
    let m;
    while ((m = pairRe.exec(raw)) !== null) {
      map[m[1]] = m[2];
      // also add lowercase key for windows paths if not present
      if (process.platform === 'win32') map[m[1].toLowerCase()] = m[2];
    }
    if (Object.keys(map).length === 0) {
      console.error('FAILED: no key/value pairs recovered from mapping.json');
      process.exit(2);
    }

    // atomic write
    const tmp = mappingFile + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(map, null, 2), 'utf8');
    await fs.promises.rename(tmp, mappingFile);
    console.log(
      'REPAIRED_BY_REGEX: mapping.json rewritten with',
      Object.keys(map).length,
      'entries'
    );
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
    process.exit(10);
  }
})();
