import React, { useEffect, useState } from 'react';

type Meta = {
  name?: string;
  size?: number;
  width?: number;
  height?: number;
  exif?: Record<string, any> | null;
};

export const MetadataPanel: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [meta, setMeta] = useState<Meta>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const name = filePath.split(/[/\\]/).pop();
        // try fetch blob to get size and arrayBuffer for EXIF
        const normalized = filePath.replace(/\\/g, '/');
        const src = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
        let size: number | undefined;
        let exif: Record<string, any> | null = null;
        try {
          const resp = await fetch(src);
          if (resp && resp.ok) {
            const blob = await resp.blob();
            size = blob.size;
            const ab = await blob.arrayBuffer();
            try {
              const exifreader = await import('exifreader');
              // exifreader.load accepts ArrayBuffer
              // @ts-ignore
              const tags = exifreader.load(ab);
              exif = tags;
            } catch (e) {
              // exifreader not present or failed
              exif = null;
            }
          }
        } catch (e) {
          // fetch may fail on some environments; ignore
        }
        // try to get image dimensions
        let width: number | undefined;
        let height: number | undefined;
        try {
          const img = new Image();
          img.src = src;
          await new Promise((res, rej) => {
            img.onload = () => res(null);
            img.onerror = () => res(null);
          });
          width = (img as any).naturalWidth;
          height = (img as any).naturalHeight;
        } catch {}
        if (!cancelled) setMeta({ name, size, width, height, exif });
      } catch (err) {
        console.error('MetadataPanel error', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{meta.name}</div>
      <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>
        {meta.width && meta.height ? `${meta.width} x ${meta.height}` : '解像度: -'}
      </div>
      <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>
        サイズ: {meta.size ? `${(meta.size / 1024).toFixed(1)} KB` : '-'}
      </div>

      {meta.exif ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>EXIF</div>
          <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(meta.exif, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>EXIF 情報はありません</div>
      )}
    </div>
  );
};

export default MetadataPanel;
