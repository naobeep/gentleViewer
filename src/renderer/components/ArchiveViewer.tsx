import React, { useEffect, useState } from 'react';

type Entry = { name: string; size?: number; isDirectory?: boolean; raw?: any };

export default function ArchiveViewer({ filePath }: { filePath: string | null }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // helper: 画像拡張子判定
  function isImage(name: string) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(ext);
  }

  useEffect(() => {
    if (!filePath) {
      setEntries(null);
      setStatus(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setStatus('Listing archive...');
        const res = await (window as any).electronAPI.invoke?.('archive.list', filePath);
        if (!mounted) return;
        if (res?.ok) {
          setEntries(res.entries || []);
          setStatus(`Found ${res.entries?.length ?? 0} entries`);
        } else {
          setEntries([]);
          setStatus(`List failed: ${res?.error ?? 'unknown'}`);
        }
      } catch (e) {
        setEntries([]);
        setStatus(`Error: ${String(e)}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [filePath]);

  if (!filePath) return null;

  return (
    <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Archive:</strong> {filePath}
      </div>

      <div style={{ marginBottom: 8 }}>
        <button
          onClick={async () => {
            try {
              setLoading(true);
              setStatus('Extracting to temp...');
              const r = await (window as any).electronAPI.invoke?.('archive.extract', filePath);
              if (r?.ok) {
                setStatus(`Extracted to: ${r.path}`);
              } else {
                setStatus(`Extract failed: ${r?.error ?? 'unknown'}`);
              }
            } catch (e) {
              setStatus(`Error: ${String(e)}`);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          Extract All
        </button>
        <span style={{ marginLeft: 12 }}>{loading ? 'working…' : status}</span>
      </div>

      <div style={{ maxHeight: 280, overflow: 'auto', fontSize: 13 }}>
        {entries === null ? (
          <div>Loading entries…</div>
        ) : entries.length === 0 ? (
          <div>No entries</div>
        ) : (
          <ul style={{ paddingLeft: 16 }}>
            {entries.map((e, i) => (
              <li
                key={i}
                style={{ cursor: e.isDirectory ? 'default' : 'pointer', marginBottom: 6 }}
              >
                <span style={{ marginRight: 8 }}>{e.isDirectory ? '📁' : '📄'}</span>
                <span
                  onClick={async () => {
                    if (e.isDirectory) return;
                    try {
                      setLoading(true);
                      setStatus(`Extracting ${e.name}...`);
                      // 抽出してビューアで開く
                      const res = await (window as any).electronAPI.invoke?.(
                        'archive.extractEntry',
                        filePath,
                        e.name
                      );
                      if (res?.ok && res.path) {
                        // 画像なら内部ビューア、それ以外は外部で開く
                        if (isImage(e.name)) {
                          (await (window as any).electronAPI.openViewer?.(res.path)) ??
                            (window as any).electronAPI.openFileExternally?.(res.path);
                        } else {
                          await (window as any).electronAPI.openFileExternally?.(res.path);
                        }
                        setStatus(null);
                      } else {
                        setStatus(`Extract failed: ${res?.error ?? 'unknown'}`);
                      }
                    } catch (err) {
                      console.error('open entry failed', err);
                      setStatus(`Error: ${String(err)}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {e.name}
                </span>
                <span style={{ marginLeft: 8, color: '#666' }}>
                  {e.size ? `(${e.size} bytes)` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
