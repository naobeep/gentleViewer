import React, { useEffect, useState } from 'react';
import ThumbnailGrid from './components/ThumbnailGrid';

type FileRec = { id: string; path: string; name: string };

export default function App(): JSX.Element {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.getFiles({ limit: 200 });
      // getFiles returns array of records (or empty array)
      setFiles(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('loadFiles', e);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // refresh when thumbnail progress completes to pick up new cache paths
    const unsub = (window as any).electronAPI.onThumbnailProgress((p: any) => {
      if (p?.status === 'completed') loadFiles();
    });
    return () => {
      try {
        unsub();
      } catch {}
    };
  }, []);

  const filePaths = files.map(f => f.path);

  return (
    <div style={{ padding: 16 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Files</h2>
        <div>
          <button onClick={loadFiles} style={{ marginRight: 8 }}>
            {loading ? '読み込み中...' : '再読み込み'}
          </button>
        </div>
      </header>

      <main>
        <ThumbnailGrid filePaths={filePaths} colCount={4} thumbWidth={160} />
      </main>
    </div>
  );
}
