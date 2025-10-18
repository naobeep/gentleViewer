import React, { useEffect, useState } from 'react';
import ThumbnailGrid from './components/ThumbnailGrid';
import SearchBar from './components/SearchBar';
import TagManager from './components/TagManager';
import FileList from './components/FileList';
import Viewer from './components/Viewer';

type FileRec = { id: string; path: string; name: string };

// simple ErrorBoundary to avoid crashing the whole layout when a sidebar component throws
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.error('ErrorBoundary caught:', err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <div>表示エラー</div>;
    return this.props.children;
  }
}

export default function App(): JSX.Element {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FileRec[] | null>(null);

  useEffect(() => {
    console.log('App mounted'); // <- レンダリング確認用ログ
    loadFiles();
    const unsub = (window as any).electronAPI.onThumbnailProgress((p: any) => {
      if (p?.status === 'completed') loadFiles();
    });
    return () => {
      try {
        unsub();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.getFiles({ limit: 200 });
      setFiles(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('loadFiles', e);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const onSearchResults = (rows: any[]) => {
    const recs: FileRec[] = Array.isArray(rows)
      ? rows.map(r => ({ id: r.id ?? r.ID ?? '', path: r.path, name: r.name }))
      : [];
    setSearchResults(recs);
  };

  // simple hash routing: #viewer?path=...
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (hash && hash.startsWith('#viewer')) {
    const params = new URLSearchParams(hash.replace('#viewer', ''));
    const pathParam = params.get('?path') ?? params.get('path') ?? '';
    if (pathParam) {
      return <Viewer filePath={decodeURIComponent(pathParam)} />;
    }
  }

  const filePaths =
    searchResults && searchResults.length > 0
      ? searchResults.map(f => f.path)
      : files.map(f => f.path);

  const openInViewer = (p: string) => {
    (window as any).electronAPI
      .openViewer(p)
      .catch((e: any) => console.error('openViewer failed', e));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', gap: 12 }}>
      <aside
        style={{
          width: 280,
          borderRight: '1px solid #eee',
          padding: 12,
          boxSizing: 'border-box',
          overflow: 'auto',
          minWidth: 200,
        }}
      >
        <ErrorBoundary fallback={<div>タグ表示中にエラーが発生しました</div>}>
          <TagManager
            onSelectTag={() => {
              /* future: filter */
            }}
          />
        </ErrorBoundary>
        <hr />
        <ErrorBoundary fallback={<div>ファイルリスト表示中にエラーが発生しました</div>}>
          <FileList onOpen={openInViewer} />
        </ErrorBoundary>
      </aside>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
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

        <SearchBar onResults={onSearchResults} />

        <main>
          <ThumbnailGrid filePaths={filePaths} colCount={4} thumbWidth={160} />
        </main>
      </div>
    </div>
  );
}
