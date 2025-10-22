import path from 'path';

export type ViewerKind = 'image' | 'pdf' | 'video' | 'audio' | 'external';

const imageExts = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
  '.ico',
  '.svg',
]);
const videoExts = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v']);
const audioExts = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac']);
const pdfExts = new Set(['.pdf']);

function extByPath(filePath: string) {
  return path.extname(filePath || '').toLowerCase();
}

async function readHead(filePath: string, size = 4096): Promise<Uint8Array | null> {
  try {
    // preload に readFile があれば先に使う（ArrayBuffer/Uint8Array を期待）
    const api = (window as any).electronAPI;
    if (api?.readFile) {
      const r = await api.readFile(filePath, { length: size }).catch(() => null);
      if (!r) return null;
      if (r.data instanceof ArrayBuffer) return new Uint8Array(r.data);
      if (r.data && r.data.buffer instanceof ArrayBuffer) return new Uint8Array(r.data.buffer);
      if (r instanceof ArrayBuffer) return new Uint8Array(r);
      // if returned base64 string
      if (typeof r.data === 'string') {
        const bin = atob(r.data.replace(/^data:.*;base64,/, ''));
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return u;
      }
    }
  } catch {
    // ignore and fallback to fetch file://
  }

  try {
    const fileUrl = encodeURI(`file://${filePath.replace(/\\/g, '/')}`);
    const resp = await fetch(fileUrl, { method: 'GET' });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf.slice(0, size));
  } catch {
    return null;
  }
}

function bytesToString(u8: Uint8Array, start = 0, len?: number) {
  if (!u8) return '';
  const end = typeof len === 'number' ? start + len : u8.length;
  let s = '';
  for (let i = start; i < end && i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function containsString(u8: Uint8Array | null, needle: string) {
  if (!u8) return false;
  const s = bytesToString(u8, 0, u8.length);
  return s.indexOf(needle) !== -1;
}

export async function detectViewerKind(filePath: string): Promise<ViewerKind> {
  const ext = extByPath(filePath);
  // 1) extension-based fast path (priority: image -> pdf -> video -> audio)
  if (imageExts.has(ext)) return 'image';
  if (pdfExts.has(ext)) return 'pdf';
  if (videoExts.has(ext)) return 'video';
  if (audioExts.has(ext)) return 'audio';

  // 2) try header/magic detection
  const head = await readHead(filePath, 8192);
  if (head) {
    // PDF: %PDF
    if (bytesToString(head, 0, 4) === '%PDF') return 'pdf';
    // JPEG
    if (head[0] === 0xff && head[1] === 0xd8) return 'image';
    // PNG
    if (head[0] === 0x89 && bytesToString(head, 1, 3) === 'PNG') return 'image';
    // GIF
    if (bytesToString(head, 0, 4) === 'GIF8') return 'image';
    // WEBP RIFF + WEBP
    if (containsString(head, 'WEBP') && containsString(head, 'RIFF')) return 'image';
    // SVG (text starts with '<?xml' or '<svg')
    const startStr = bytesToString(head, 0, 64).trim().toLowerCase();
    if (startStr.startsWith('<?xml') || startStr.includes('<svg')) return 'image';
    // OGG (audio/video)
    if (bytesToString(head, 0, 4) === 'OggS') {
      // uncertain: often audio. treat as audio.
      return 'audio';
    }
    // RIFF (WAVE/AVI)
    if (bytesToString(head, 0, 4) === 'RIFF') {
      if (containsString(head, 'WAVE')) return 'audio';
      return 'video';
    }
    // MP4/ISOBMFF: 'ftyp' box
    if (containsString(head, 'ftyp')) {
      // heuristics: if extensionless but ftyp present, likely video (mp4/mov)
      return 'video';
    }
    // EBML (Matroska/Webm)
    if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
      // matroska/webm => video
      return 'video';
    }
  }

  // 3) fallback rules: unknown extension -> try as image first per priority
  return 'image';
}
