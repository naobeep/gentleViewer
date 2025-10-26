import React, { useEffect, useState } from 'react';
import ThumbnailGrid from './components/ThumbnailGrid';
import SearchBar from './components/SearchBar';
import TagManager from './components/TagManager';
import FileList from './components/FileList';
import Viewer from './components/Viewer';
import ArchiveViewer from './components/ArchiveViewer';
import CacheManager from './components/CacheManager';
import ThumbnailSettings from './components/ThumbnailSettings';

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
  const [reindexing, setReindexing] = useState(false);
  const [reindexStatus, setReindexStatus] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileRec | null>(null);

  useEffect(() => {
    console.log('App mounted');
    loadFiles();
    let unsub: (() => void) | null = null;
    let unsubReindex: (() => void) | null = null;
    try {
      const handler = (p: any) => {
        if (p?.status === 'completed') loadFiles();
      };
      if ((window as any).electronAPI.onThumbnailProgress) {
        unsub = (window as any).electronAPI.onThumbnailProgress(handler);
      } else if ((window as any).electronAPI.on) {
        unsub = (window as any).electronAPI.on('thumbnail-progress', handler);
      }
      const reindexHandler = (payload: any) => {
        console.log('reindex-done received', payload);
        // 再インデックス完了なら一覧更新
        try {
          loadFiles();
        } catch (e) {
          console.error('loadFiles after reindex-done failed', e);
        }
      };
      const api = (window as any).electronAPI;
      if (api?.onReindexDone) {
        unsubReindex = api.onReindexDone(reindexHandler);
      } else if (api?.on) {
        unsubReindex = api.on('reindex-done', reindexHandler);
      }
    } catch (err) {
      console.error('subscribe thumbnail progress failed', err);
    }
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
        if (typeof unsubReindex === 'function') unsubReindex();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.getFiles({ limit: 200 });
      let arr: any[] = [];
      if (Array.isArray(res)) arr = res;
      else if (res && typeof res === 'object') {
        if (Array.isArray(res.data)) arr = res.data;
        else if (res.ok && Array.isArray(res.result)) arr = res.result;
      }
      setFiles(arr);
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

  async function reindexFTSHandler() {
    const api = (window as any).electronAPI;
    try {
      let result;
      if (typeof api?.reindexFTS === 'function') {
        // preload が個別 API を公開している場合
        result = await api.reindexFTS();
      } else if (typeof api?.invoke === 'function') {
        // 汎用 invoke があればそれを使う
        result = await api.invoke('reindex-ft');
      } else if (typeof api?.reindexFT === 'function') {
        // まれに別名が使われている場合の追加フォールバック
        result = await api.reindexFT();
      } else {
        throw new Error('no reindex IPC available on electronAPI');
      }
      console.log('reindexFTS result', result);
      return result;
    } catch (err) {
      console.error('reindexFTS failed', err);
      throw err;
    }
  }

  async function handleReindexClick() {
    try {
      console.log('onClickReindex: start');
      setReindexing(true);
      setReindexStatus('Reindexing...');
      const api = (window as any).electronAPI;
      const res = api?.reindexFTS
        ? await api.reindexFTS({ force: true })
        : await api.invoke?.('reindex-ft', { force: true });
      console.log('reindexFTS result', res);
      if (res?.ok) {
        setReindexStatus('Reindex OK');
        // 再インデックス成功時にファイル一覧を再読み込みして画面を更新
        try {
          await loadFiles();
        } catch (e) {
          console.error('loadFiles after reindex failed', e);
        }
      } else {
        setReindexStatus(`Failed: ${res?.error}`);
      }
    } catch (err) {
      console.error('onClickReindex error', err);
      setReindexStatus(`Error: ${String(err)}`);
    } finally {
      setReindexing(false);
    }
  }

  function isArchiveFile(nameOrPath: string | undefined | null) {
    if (!nameOrPath) return false;
    const ext = nameOrPath.split('.').pop()?.toLowerCase() ?? '';
    return ['zip', '7z', 'rar', '001'].includes(ext);
  }

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
            <button
              id="reindex-btn"
              onClick={handleReindexClick}
              disabled={reindexing}
              aria-pressed={reindexing}
              style={{ marginRight: 8 }}
            >
              {reindexing ? 'Reindexing…' : 'FTS再インデックス'}
            </button>
          </div>
        </header>

        {reindexStatus && <div id="reindex-status">{reindexStatus}</div>}

        <SearchBar onResults={onSearchResults} />

        <main>
          <ThumbnailGrid filePaths={filePaths} colCount={4} thumbWidth={160} />
        </main>
      </div>

      <div>
        {/* 既存のファイル一覧 UI の近くで選択中ファイルを渡す */}
        {selectedFile && isArchiveFile(selectedFile.path) && (
          <div style={{ marginTop: 12 }}>
            <ArchiveViewer filePath={selectedFile.path} />
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <CacheManager />
        </div>
        <div style={{ marginTop: 12 }}>
          <ThumbnailSettings />
        </div>
        {/* ...existing UI continues ... */}
      </div>
    </div>
  );
}
