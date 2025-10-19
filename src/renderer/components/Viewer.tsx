import React, { useState } from 'react';
import ImageViewer from './ImageViewer';
import MetadataPanel from './MetadataPanel';
import PdfViewer from './PdfViewer';

type Props = {
  filePath: string;
};

const ext = (p: string) => {
  const m = p.split('?')[0].split('#')[0];
  const dot = m.lastIndexOf('.');
  return dot >= 0 ? m.slice(dot).toLowerCase() : '';
};

const toFileUrl = (p?: string | null) => {
  if (!p) return undefined;
  const normalized = p.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return `file://${normalized}`;
  return `file:///${normalized}`;
};

export const Viewer: React.FC<Props> = ({ filePath }) => {
  const e = ext(filePath);
  const src = toFileUrl(filePath);
  const [showMeta, setShowMeta] = useState(false);

  const handleOpenExternally = async () => {
    try {
      await (window as any).electronAPI.openFileExternally(filePath);
    } catch (err) {
      console.error('open externally failed', err);
      alert('外部で開けませんでした: ' + String(err));
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => history.back()}>← 戻る</button>
        <div style={{ fontSize: 13, color: '#444' }}>{filePath}</div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleOpenExternally}>外部アプリで開く</button>
          <button onClick={() => setShowMeta(s => !s)} style={{ marginLeft: 8 }}>
            {showMeta ? 'メタ非表示' : 'メタ表示'}
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, minHeight: 300 }}>
        {/* 画像 */}
        {['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].includes(e) && filePath && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ImageViewer filePath={filePath} showMeta={false} />
            </div>
            {showMeta && (
              <aside style={{ width: 320, borderLeft: '1px solid #eee', paddingLeft: 12 }}>
                <MetadataPanel filePath={filePath} />
              </aside>
            )}
          </div>
        )}

        {/* PDF: PdfViewer を使用 */}
        {e === '.pdf' && filePath && <PdfViewer filePath={filePath} />}

        {/* video/audio */}
        {['.mp4', '.webm', '.ogg', '.mov', '.mkv'].includes(e) && src && (
          <video controls src={src} style={{ width: '100%', maxHeight: '80vh' }} />
        )}

        {['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'].includes(e) && src && (
          <div>
            <audio controls src={src} style={{ width: '100%' }} />
          </div>
        )}

        {/* archive / unsupported */}
        {![
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.webp',
          '.bmp',
          '.tiff',
          '.pdf',
          '.mp4',
          '.webm',
          '.ogg',
          '.mov',
          '.mkv',
          '.mp3',
          '.wav',
          '.m4a',
          '.flac',
          '.aac',
        ].includes(e) && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ marginBottom: 12 }}>
              このファイルタイプはビルトインプレビューに対応していません。
            </div>
            <button onClick={handleOpenExternally}>外部アプリで開く</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Viewer;
