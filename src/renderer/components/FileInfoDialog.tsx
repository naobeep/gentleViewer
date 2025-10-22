import React, { useEffect, useState } from 'react';

type FileMeta = {
  path: string;
  size?: number;
  mime?: string;
  createdAt?: string;
  updatedAt?: string;
  // backward compat fields handled when reading stat
  created?: string;
  mtime?: string;
};

function apiTry<T = any>(fnNames: string[], ...args: any[]): Promise<T | null> {
  const api = (window as any).electronAPI;
  for (const n of fnNames) {
    const fn = api?.[n];
    if (typeof fn === 'function') {
      try {
        return Promise.resolve(fn(...args));
      } catch (e) {
        return Promise.reject(e);
      }
    }
  }
  return Promise.resolve(null);
}

export default function FileInfoDialog({
  open,
  filePath,
  onClose,
}: {
  open: boolean;
  filePath?: string;
  onClose?: () => void;
}) {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [tags, setTags] = useState<Array<{ id: string | number; name: string }>>([]);
  const [thumbPath, setThumbPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !filePath) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const stat =
          (await apiTry<FileMeta>(['getFileStat', 'stat', 'fileStat'], filePath)) || null;
        const fileTags =
          (await apiTry<string[] | number[]>(
            ['getFileTags', 'tags.getForFile', 'tags.getByFile'],
            filePath
          )) || [];
        const allTags =
          (await apiTry<Array<{ id: string | number; name: string }>>(['getTags', 'tags.list'])) ||
          [];
        const thumb =
          (await apiTry<string>(['getThumbnailPath', 'thumbnail.getPath'], filePath)) || null;

        if (!mounted) return;

        setMeta(
          stat
            ? {
                path: filePath,
                size: stat.size,
                mime: stat.mime,
                createdAt: stat.createdAt || stat.created || undefined,
                updatedAt: stat.updatedAt || stat.mtime || undefined,
              }
            : { path: filePath }
        );

        const tagSet = new Set((fileTags ?? []).map(String));
        const assigned = Array.isArray(allTags)
          ? allTags.filter(t => tagSet.has(String((t as any).id)))
          : [];
        setTags(assigned.map(t => ({ id: (t as any).id, name: (t as any).name })));
        setThumbPath(thumb || null);
      } catch (e) {
        console.warn('FileInfoDialog load error', e);
        if (mounted) {
          setMeta({ path: filePath });
          setTags([]);
          setThumbPath(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, filePath]);

  if (!open) return null;

  const humanSize = (n?: number) => {
    if (n === undefined || n === null) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const openExternal = () => {
    if (!filePath) return;
    const api = (window as any).electronAPI;
    if (api?.openPath) api.openPath(filePath).catch?.(() => {});
    else if (api?.openExternal)
      api.openExternal(`file://${filePath.replace(/\\/g, '/')}`).catch?.(() => {});
    else window.open(encodeURI(`file://${filePath.replace(/\\/g, '/')}`), '_blank');
  };

  const revealInFolder = () => {
    if (!filePath) return;
    const api = (window as any).electronAPI;
    const tryNames = ['showItemInFolder', 'revealInFolder', 'showInFolder', 'showItem'];
    for (const n of tryNames) {
      const fn = api?.[n];
      if (typeof fn === 'function') {
        try {
          fn(filePath);
          return;
        } catch {}
      }
    }
    const parent = filePath ? filePath.replace(/[/\\][^/\\]+$/, '') : undefined;
    if (parent) {
      if ((window as any).electronAPI?.openPath)
        (window as any).electronAPI.openPath(parent).catch?.(() => {});
      else window.open(encodeURI(`file://${parent.replace(/\\/g, '/')}`), '_blank');
    }
  };

  const buildThumbSrc = (tp: string) => {
    if (!tp) return null;
    if (/^data:/.test(tp)) return tp;
    // if already file:// or http(s) leave as-is
    if (/^file:\/\//.test(tp) || /^https?:\/\//.test(tp)) return tp;
    // otherwise treat as file path
    return encodeURI(`file://${tp.replace(/\\/g, '/')}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 720,
          maxHeight: '80vh',
          background: '#fff',
          borderRadius: 6,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <strong>ファイル情報</strong>
          <div style={{ flex: 1 }} />
          <button onClick={() => onClose?.()}>閉じる</button>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: 12, overflow: 'auto' }}>
          <div style={{ width: 220, borderRight: '1px solid #f4f4f4', paddingRight: 12 }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: '#444' }}>サムネイル</div>
            <div
              style={{
                width: '100%',
                height: 180,
                background: '#f6f6f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {thumbPath ? (
                <img
                  alt="thumb"
                  src={buildThumbSrc(thumbPath) || undefined}
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <div style={{ color: '#999' }}>{loading ? '読み込み中…' : 'なし'}</div>
              )}
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={openExternal} disabled={!filePath}>
                開く
              </button>
              <button onClick={revealInFolder} disabled={!filePath}>
                フォルダで表示
              </button>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#444' }}>基本情報</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                rowGap: 8,
                columnGap: 12,
              }}
            >
              <div style={{ color: '#666' }}>パス</div>
              <div style={{ wordBreak: 'break-all' }}>{meta?.path ?? '-'}</div>
              <div style={{ color: '#666' }}>サイズ</div>
              <div>{humanSize(meta?.size)}</div>
              <div style={{ color: '#666' }}>タイプ</div>
              <div>{meta?.mime ?? '-'}</div>
              <div style={{ color: '#666' }}>作成日時</div>
              <div>{meta?.createdAt ?? '-'}</div>
              <div style={{ color: '#666' }}>更新日時</div>
              <div>{meta?.updatedAt ?? '-'}</div>
              <div style={{ color: '#666' }}>タグ</div>
              <div>
                {tags.length === 0 ? (
                  <span style={{ color: '#999' }}>なし</span>
                ) : (
                  tags.map(t => (
                    <span
                      key={String(t.id)}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        marginRight: 6,
                        background: '#eef',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    >
                      {t.name}
                    </span>
                  ))
                )}
              </div>
              <div style={{ color: '#666' }}>サムネイルパス</div>
              <div style={{ wordBreak: 'break-all' }}>{thumbPath ?? '-'}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 10, borderTop: '1px solid #eee', textAlign: 'right' }}>
          <button onClick={() => onClose?.()}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
