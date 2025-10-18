import React from 'react';

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
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, minHeight: 300 }}>
        {['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].includes(e) && src && (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={src}
            alt="image"
            style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
          />
        )}

        {e === '.pdf' && src && (
          <embed src={src} type="application/pdf" width="100%" height="80vh" />
        )}

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
