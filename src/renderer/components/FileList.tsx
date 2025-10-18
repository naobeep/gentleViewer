import React, { useEffect, useState } from 'react';

type FileRec = { id: string; path: string; name: string };

export const FileList: React.FC<{ onOpen?: (filePath: string) => void }> = ({ onOpen }) => {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.getFiles({ limit: 500 });
      setFiles(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('FileList loadFiles', e);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // subscribe to thumbnails complete to refresh
    const unsub = (window as any).electronAPI.onThumbnailProgress((p: any) => {
      if (p?.status === 'completed') loadFiles();
    });
    return () => {
      try {
        unsub();
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
                style={{ padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                onDoubleClick={() =>
                  onOpen ? onOpen(f.path) : (window as any).electronAPI.openViewer(f.path)
                }
                title={f.path}
              >
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileList;
