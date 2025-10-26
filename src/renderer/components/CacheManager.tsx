import React, { useEffect, useState } from 'react';

export default function CacheManager() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<{ maxSizeMB: number; ttlDays: number } | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [logLines, setLogLines] = useState<string[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const p =
        (await (window as any).electronAPI.getCachePolicy?.()) ??
        (await (window as any).electronAPI.invoke?.('cache.getPolicy'));
      if (p?.ok)
        setPolicy({
          maxSizeMB: Math.round(p.policy.maxSizeBytes / (1024 * 1024)),
          ttlDays: Math.round(p.policy.ttlSeconds / (24 * 3600)),
        });
      const r =
        (await (window as any).electronAPI.getCacheInfo?.()) ??
        (await (window as any).electronAPI.invoke?.('cache.getInfo'));
      if (r?.ok) setInfo(r.info);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    const handler = (p: any) => {
      setProgress(p);
      if (p?.phase === 'ttl' || p?.phase === 'size') {
        const msg = `${p.phase}: ${p.currentFile ?? ''} removedFiles=${p.removedFiles ?? ''} removedBytes=${p.removedBytes ?? ''}`;
        setLogLines(lines => [...lines, msg]);
      } else if (p?.phase === 'scan') {
        setLogLines(lines => [...lines, `scan: scanned=${p.scannedFiles ?? 0}`]);
      } else if (p?.phase === 'done') {
        setLogLines(lines => [...lines, `done: remainingBytes=${p.remainingBytes ?? 0}`]);
        refresh();
      } else if (p?.phase === 'error') {
        setLogLines(lines => [...lines, `error: ${p.message ?? ''}`]);
      }
    };
    if (api?.onCachePruneProgress) {
      api.onCachePruneProgress(handler);
    } else if (api?.on) {
      api.on('cache-prune-progress', handler);
    }
    return () => {
      // no-op unsubscribe for simple safeOn wrapper; if unsubscribe API exists, call it.
    };
  }, []);

  return (
    <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
      <h4>キャッシュ管理</h4>
      <div>ディレクトリ: {info?.dir ?? '—'}</div>
      <div>
        サイズ: {info ? `${Math.round(info.totalSize / 1024)} KB (${info.fileCount} files)` : '—'}
      </div>
      <div style={{ marginTop: 8 }}>
        <button
          onClick={async () => {
            setLoading(true);
            (await (window as any).electronAPI.pruneCache?.({ force: true })) ??
              (await (window as any).electronAPI.invoke?.('cache.prune', { force: true }));
            await refresh();
          }}
        >
          TTL/サイズで削除 (force)
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            (await (window as any).electronAPI.clearCache?.()) ??
              (await (window as any).electronAPI.invoke?.('cache.clear'));
            await refresh();
          }}
          style={{ marginLeft: 8 }}
        >
          全削除
        </button>
        <button onClick={refresh} style={{ marginLeft: 8 }}>
          更新
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <div
          style={{
            height: 10,
            background: '#eee',
            borderRadius: 4,
            overflow: 'hidden',
            width: 300,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.round((((info?.totalSize ?? 0) - (progress?.removedBytes ?? 0)) / Math.max(1, (policy?.maxSizeMB ?? 200) * 1024 * 1024)) * 100))}%`,
              background: '#4caf50',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
          {progress ? `${progress.phase} ${progress.currentFile ?? ''}` : ''}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          maxHeight: 160,
          overflow: 'auto',
          background: '#fff',
          border: '1px solid #eee',
          padding: 6,
        }}
      >
        {logLines.map((l, i) => (
          <div key={i} style={{ fontSize: 12 }}>
            {l}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <label>上限 (MB):</label>
        <input
          type="number"
          defaultValue={policy?.maxSizeMB ?? 200}
          id="cache-max-mb"
          style={{ width: 80, marginLeft: 8 }}
        />
        <label style={{ marginLeft: 12 }}>TTL (days):</label>
        <input
          type="number"
          defaultValue={policy?.ttlDays ?? 30}
          id="cache-ttl-days"
          style={{ width: 60, marginLeft: 8 }}
        />
        <button
          onClick={async () => {
            const max = Number(
              (document.getElementById('cache-max-mb') as HTMLInputElement).value || 0
            );
            const ttl = Number(
              (document.getElementById('cache-ttl-days') as HTMLInputElement).value || 0
            );
            (await (window as any).electronAPI.setCachePolicy?.({
              maxSizeMB: max,
              ttlDays: ttl,
            })) ??
              (await (window as any).electronAPI.invoke?.('cache.setPolicy', {
                maxSizeMB: max,
                ttlDays: ttl,
              }));
            await refresh();
          }}
          style={{ marginLeft: 8 }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
