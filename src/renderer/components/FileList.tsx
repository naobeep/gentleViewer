import React, { useEffect, useState } from 'react';

type FileRec = { id: string; path: string; name: string };

export const FileList: React.FC<{ onOpen?: (filePath: string) => void }> = ({ onOpen }) => {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.getFiles({ limit: 500 });
      // unwrap possible response shapes: Array or { ok: true, data: Array }
      let arr: any[] = [];
      if (Array.isArray(res)) arr = res;
      else if (res && typeof res === 'object') {
        if (Array.isArray(res.data)) arr = res.data;
        else if (res.ok && Array.isArray(res.result)) arr = res.result;
      }
      setFiles(arr);
      // fetch thumbnails for loaded files (parallel)
      const promises = arr.map((f: any) =>
        (window as any).electronAPI.getThumbnailPath
          ? (window as any).electronAPI
              .getThumbnailPath(f.path)
              .then((p: string | null) => ({ id: f.id, p }))
              .catch(() => ({ id: f.id, p: null }))
          : Promise.resolve({ id: f.id, p: null })
      );
      const results = await Promise.all(promises);
      const map: Record<string, string | null> = {};
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        map[r.id] = r.p ?? null;
      }

      // file:// の場合は main 経由で base64 data URL を取得して置き換える（フォールバック）
      const fetchDataPromises = arr.map(async (f: any) => {
        const p = map[f.id];
        if (
          typeof p === 'string' &&
          p.startsWith('file://') &&
          (window as any).electronAPI.getThumbnailData
        ) {
          try {
            const dataUrl = await (window as any).electronAPI.getThumbnailData(f.path);
            if (dataUrl) map[f.id] = dataUrl;
          } catch (e) {
            // ignore
          }
        }
      });
      await Promise.all(fetchDataPromises);

      setThumbs(map);
    } catch (e) {
      console.error('FileList loadFiles', e);
      setFiles([]);
      setThumbs({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // subscribe to thumbnails complete to refresh
    let unsub: (() => void) | null = null;
    try {
      const handler = (p: any) => {
        if (p?.status === 'completed') loadFiles();
      };
      if ((window as any).electronAPI.onThumbnailProgress) {
        unsub = (window as any).electronAPI.onThumbnailProgress(handler);
      } else if ((window as any).electronAPI.on) {
        // fallback generic subscribe
        unsub = (window as any).electronAPI.on('thumbnail-progress', handler);
      }
    } catch (err) {
      // ignore subscribe errors
      console.error('subscribe thumbnail progress failed', err);
    }
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
  }, []);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <strong>Files</strong>
        <button onClick={loadFiles} style={{ marginLeft: 'auto' }}>
          {loading ? '読み込み中...' : '更新'}
        </button>
      </div>

      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        {files.length === 0 ? (
          <div>ファイルがありません</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {files.map(f => (
              <li
                key={f.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: 8,
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
                onDoubleClick={() =>
                  onOpen ? onOpen(f.path) : (window as any).electronAPI.openViewer(f.path)
                }
                title={f.path}
              >
                <div style={{ width: 48, height: 48, flex: '0 0 48px' }}>
                  {thumbs[f.id] ? (
                    <img
                      src={thumbs[f.id] as string}
                      alt={f.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: '#f4f4f4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: 12,
                        borderRadius: 4,
                      }}
                    >
                      No
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#666',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {f.path}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileList;
