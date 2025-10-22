import React, { Suspense, useEffect, useState } from 'react';
import { detectViewerKind, ViewerKind } from '../utils/viewerResolver';
import { FileInfoDialog } from './index'; // 追加: FileInfoDialog をインポート

// lazy load heavy viewers
const PdfViewer = React.lazy(() => import('./PdfViewer'));
const ImageViewer = React.lazy(() => import('./ImageViewer'));

function VideoPlayer({ filePath }: { filePath: string }) {
  return (
    <video controls style={{ width: '100%', height: '100%' }}>
      <source src={encodeURI(`file://${filePath.replace(/\\/g, '/')}`)} />
      このブラウザは video をサポートしていません。
    </video>
  );
}

function AudioPlayer({ filePath }: { filePath: string }) {
  return (
    <audio controls style={{ width: '100%' }}>
      <source src={encodeURI(`file://${filePath.replace(/\\/g, '/')}`)} />
      このブラウザは audio をサポートしていません。
    </audio>
  );
}

export default function ViewerSwitch({ filePath }: { filePath: string }) {
  const [kind, setKind] = useState<ViewerKind | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const k = await detectViewerKind(filePath).catch(() => 'external' as ViewerKind);
      if (!mounted) return;
      setKind(k);
    })();
    return () => {
      mounted = false;
    };
  }, [filePath]);

  const openExternally = () => {
    const api = (window as any).electronAPI;
    if (api?.openPath) {
      api.openPath(filePath).catch?.(() => {});
    } else if (api?.openExternal) {
      api.openExternal(`file://${filePath.replace(/\\/g, '/')}`).catch?.(() => {});
    } else {
      window.open(encodeURI(`file://${filePath.replace(/\\/g, '/')}`), '_blank');
    }
  };

  if (!kind) return <div>判定中…</div>;

  // 共通ツールバー（右上にファイル情報ボタンを追加）
  const Toolbar = () => (
    <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 5 }}>
      <button onClick={() => setInfoOpen(true)} title="ファイル情報">
        ℹ️
      </button>
      <button onClick={openExternally} title="外部で開く" style={{ marginLeft: 8 }}>
        ↗
      </button>
    </div>
  );

  if (kind === 'image') {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <Toolbar />
        <Suspense fallback={<div>読み込み中…</div>}>
          <ImageViewer filePath={filePath} />
        </Suspense>
        <FileInfoDialog open={infoOpen} filePath={filePath} onClose={() => setInfoOpen(false)} />
      </div>
    );
  }
  if (kind === 'pdf') {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <Toolbar />
        <Suspense fallback={<div>PDF 読み込み中…</div>}>
          {/* @ts-ignore */}
          <PdfViewer filePath={filePath} />
        </Suspense>
        <FileInfoDialog open={infoOpen} filePath={filePath} onClose={() => setInfoOpen(false)} />
      </div>
    );
  }
  if (kind === 'video') {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <Toolbar />
        <VideoPlayer filePath={filePath} />
        <FileInfoDialog open={infoOpen} filePath={filePath} onClose={() => setInfoOpen(false)} />
      </div>
    );
  }
  if (kind === 'audio') {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <Toolbar />
        <AudioPlayer filePath={filePath} />
        <FileInfoDialog open={infoOpen} filePath={filePath} onClose={() => setInfoOpen(false)} />
      </div>
    );
  }
  // external fallback
  return (
    <div style={{ padding: 16 }}>
      <div>このファイルは統合ビューアで表示できません。</div>
      <div style={{ marginTop: 8 }}>
        <button onClick={openExternally}>外部で開く</button>
        <button onClick={() => setInfoOpen(true)} style={{ marginLeft: 8 }}>
          ファイル情報
        </button>
      </div>
      <FileInfoDialog open={infoOpen} filePath={filePath} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
