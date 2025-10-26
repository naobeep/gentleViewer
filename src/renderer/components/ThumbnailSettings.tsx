import React, { useEffect, useState } from 'react';

export default function ThumbnailSettings() {
  const [concurrency, setConcurrency] = useState<number>(4);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res =
          (await (window as any).electronAPI.getThumbnailConfig?.()) ??
          (await (window as any).electronAPI.invoke?.('thumbnail.getConfig'));
        if (res?.ok) setConcurrency(res.config.concurrency ?? 4);
      } catch (e) {
        console.error(e);
      }
    })();

    const api = (window as any).electronAPI;
    const handler = (p: any) => {
      setProgress(p);
    };
    // safe subscription: prefer onThumbnailProgress(cb) if exposed, else fallback to generic on(channel, cb)
    if (typeof api?.onThumbnailProgress === 'function') {
      api.onThumbnailProgress(handler);
    } else if (typeof api?.on === 'function') {
      api.on('thumbnail-progress', handler);
    }
    return () => {
      // noop: safeOn wrapper in preload may return unsubscribe; if available call it here.
    };
  }, []);

  return (
    <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
      <h4>サムネイル設定</h4>
      <div style={{ marginBottom: 8 }}>
        <label>並列度 (workers): </label>
        <input
          type="number"
          value={concurrency}
          min={1}
          max={32}
          onChange={e => setConcurrency(Number(e.target.value || 1))}
          style={{ width: 80, marginLeft: 8 }}
        />
        <button
          style={{ marginLeft: 8 }}
          onClick={async () => {
            try {
              const res =
                (await (window as any).electronAPI.setThumbnailConfig?.({ concurrency })) ??
                (await (window as any).electronAPI.invoke?.('thumbnail.setConfig', {
                  concurrency,
                }));
              if (res?.ok) setStatus('保存しました');
              else setStatus('保存失敗');
            } catch (e) {
              setStatus(String(e));
            }
          }}
        >
          保存
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <button
          onClick={async () => {
            setStatus('開始準備中...');
            try {
              const api = (window as any).electronAPI;
              const filesRes = await (api.getFiles?.() ?? api.invoke?.('getFiles'));
              // support both { ok: true, files: [...] } and { ok: true, data: [...] }
              const list = filesRes?.ok
                ? (filesRes.files ?? filesRes.data ?? []).map((f: any) => f.path).filter(Boolean)
                : [];
              const r = await (api.startThumbnailManaged?.(list, { concurrency }) ??
                api.invoke?.('thumbnail.startManaged', list, { concurrency }));
              setStatus(r?.ok ? `開始: ${r.count} files` : `失敗: ${r?.error ?? 'unknown'}`);
            } catch (e) {
              setStatus(String(e));
            }
          }}
        >
          並列生成を開始
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div>進捗: {progress ? JSON.stringify(progress) : '—'}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{status}</div>
      </div>
    </div>
  );
}
