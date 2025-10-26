import React, { useEffect, useState } from 'react';
import MainLayout from './layouts/MainLayout';
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

      // DEBUG: ファイルレコードの簡易ログ（サムネイル関連のフィールドをチェック）
      console.debug('loadFiles: total=', arr.length);
      for (let i = 0; i < Math.min(arr.length, 10); i++) {
        const it = arr[i];
        const thumbCandidates = [
          it.thumbnail,
          it.thumb,
          it.thumbPath,
          it.thumbnailPath,
          it.preview,
        ];
        console.debug('file[', i, ']:', {
          id: it.id,
          path: it.path,
          name: it.name,
          thumbPresent: thumbCandidates.some(Boolean),
          thumbCandidates,
        });
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

  // FTS 再インデックス実行ハンドラ
  async function handleReindexClick() {
    try {
      setReindexing(true);
      setReindexStatus('Reindexing...');

      const api = (window as any).electronAPI;
      let res: any = null;

      if (api?.reindexFTS && typeof api.reindexFTS === 'function') {
        res = await api.reindexFTS({ force: true });
      } else if (typeof api?.invoke === 'function') {
        res = await api.invoke('reindex-ft', { force: true });
      } else {
        throw new Error('reindex API not available');
      }

      if (res?.ok) {
        setReindexStatus('Reindex OK');
        try {
          await loadFiles();
        } catch (e) {
          console.error('loadFiles after reindex failed', e);
        }
      } else {
        setReindexStatus(`Failed: ${res?.error ?? 'unknown'}`);
      }
    } catch (err) {
      console.error('handleReindexClick error', err);
      setReindexStatus(`Error: ${String(err)}`);
    } finally {
      setReindexing(false);
    }
  }

  // サムネイル生成を明示的に要求するヘルパー（IPC の実装名に応じてフォールバック）
  async function ensureThumbnails() {
    try {
      const api = (window as any).electronAPI;
      const paths =
        searchResults && searchResults.length > 0
          ? searchResults.map((f: any) => f.path)
          : files.map(f => f.path);
      console.info('ensureThumbnails: requesting for', paths.length, 'files');
      let resp;
      if (api?.generateThumbnails && typeof api.generateThumbnails === 'function') {
        resp = await api.generateThumbnails(paths);
      } else if (typeof api?.invoke === 'function') {
        resp = await api.invoke('generate-thumbnails', { paths });
      } else if (api?.generateThumbs && typeof api.generateThumbs === 'function') {
        resp = await api.generateThumbs(paths);
      } else {
        throw new Error('generate thumbnails IPC not available');
      }
      console.info('ensureThumbnails result', resp);
    } catch (err) {
      console.error('ensureThumbnails failed', err);
    }
  }

  // sidebar content previously inline
  const sidebarContent = (
    <div>
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
    </div>
  );

  // toolbar right: reload / reindex buttons
  const toolbarRight = (
    <div>
      <button onClick={loadFiles} style={{ marginRight: 8 }}>
        {loading ? '読み込み中...' : '再読み込み'}
      </button>
      <button onClick={ensureThumbnails} style={{ marginRight: 8 }}>
        サムネイル生成
      </button>
      <button
        id="reindex-btn"
        onClick={handleReindexClick}
        disabled={reindexing}
        aria-pressed={reindexing}
      >
        {reindexing ? 'Reindexing…' : 'FTS再インデックス'}
      </button>
    </div>
  );

  // ファイル一覧または検索結果から表示するパス配列を作成
  const filePaths =
    searchResults && searchResults.length > 0
      ? searchResults.map(f => f.path)
      : files.map(f => f.path);

  // アーカイブ判定ユーティリティ
  function isArchiveFile(nameOrPath?: string | null) {
    if (!nameOrPath) return false;
    const ext = (nameOrPath.split('.').pop() || '').toLowerCase();
    return ['zip', '7z', 'rar', '001'].includes(ext);
  }

  // main children : center (files) + right panel
  const mainChildren = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, height: '100%' }}>
      <div style={{ overflow: 'auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Files</h2>
          {/* toolbar buttons are moved to MainLayout.toolbarRight */}
        </header>

        {reindexStatus && <div id="reindex-status">{reindexStatus}</div>}

        <SearchBar onResults={onSearchResults} />

        <main>
          <ThumbnailGrid filePaths={filePaths} colCount={4} thumbWidth={160} />
        </main>
      </div>

      <div style={{ overflow: 'auto' }}>
        {/* 右側パネル：選択ファイルに応じたビューや設定系 */}
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
      </div>
    </div>
  );

  // hash routing short-circuit (viewer)
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (hash && hash.startsWith('#viewer')) {
    const params = new URLSearchParams(hash.replace('#viewer', ''));
    const pathParam = params.get('?path') ?? params.get('path') ?? '';
    if (pathParam) {
      return <Viewer filePath={decodeURIComponent(pathParam)} />;
    }
  }

  return (
    <MainLayout
      sidebarChildren={sidebarContent}
      toolbarRight={toolbarRight}
      statusRight={<div>v1.0.0</div>}
    >
      {mainChildren}
    </MainLayout>
  );
}
function openInViewer(filePath: string): void {
  try {
    const api = (window as any).electronAPI;
    if (api?.openViewer && typeof api.openViewer === 'function') {
      // preload が便利 API を公開している場合
      api.openViewer(filePath);
      return;
    }
    if (typeof api?.invoke === 'function') {
      // 汎用 invoke にフォールバック
      api
        .invoke('open-viewer', filePath)
        .catch((e: any) => console.error('open-viewer invoke failed', e));
      return;
    }
    // 最終手段: ハッシュで viewer に遷移
    window.location.hash = `#viewer?path=${encodeURIComponent(filePath)}`;
  } catch (e) {
    console.error('openInViewer failed', e);
  }
}
