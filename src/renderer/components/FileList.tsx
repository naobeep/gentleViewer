import React, { useEffect, useState } from 'react';

type FileRec = { id: string; path: string; name: string };

export const FileList: React.FC<{ onDoubleClick?: (filePath: string) => void }> = ({
  onDoubleClick,
}) => {
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
    <div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={loadFiles}>{loading ? '読み込み中...' : '再読み込み'}</button>
      </div>
      <div>
        {files.length === 0 ? (
          <div>ファイルがありません</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {files.map(f => (
              <li
                key={f.id}
                style={{ padding: 6, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                onDoubleClick={() =>
                  onDoubleClick
                    ? onDoubleClick(f.path)
                    : (window as any).electronAPI.openViewer(f.path)
                }
              >
                <div style={{ fontSize: 13 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{f.path}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileList;
