import React, { useEffect, useState } from 'react';

export default function CacheSettings() {
  const [info, setInfo] = useState<any>(null);
  const [policy, setPolicy] = useState<any>({
    maxSizeBytes: 0,
    ttlSeconds: 0,
    intervalMinutes: 60,
    enabled: false,
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.cache.getInfo();
      setInfo(res?.info || null);
      const p = await (window as any).electronAPI.cache.getPolicy();
      if (p?.ok) setPolicy(p.policy);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runPrune = async () => {
    setLoading(true);
    try {
      const r =
        (await (window as any).electronAPI.cache.prune?.({ force: true })) ??
        (window as any).electronAPI.invoke?.('cache.prune', { force: true });
      console.log('prune', r);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    await (window as any).electronAPI.cache.setPolicy(policy);
    // start auto if enabled
    if (policy.enabled) await (window as any).electronAPI.cache.startAuto();
    else await (window as any).electronAPI.cache.stopAuto();
    await load();
  };

  return (
    <div style={{ padding: 12 }}>
      <h3>Cache</h3>
      <div>dir: {info?.dir}</div>
      <div>totalSize: {info ? (info.totalSize / 1024 / 1024).toFixed(2) + ' MB' : '-'}</div>
      <div>fileCount: {info?.fileCount ?? '-'}</div>

      <div style={{ marginTop: 12 }}>
        <label>
          maxSizeBytes (MB):
          <input
            type="number"
            value={Math.round((policy.maxSizeBytes || 0) / 1024 / 1024)}
            onChange={e =>
              setPolicy({ ...policy, maxSizeBytes: Number(e.target.value) * 1024 * 1024 })
            }
          />
        </label>
      </div>
      <div>
        <label>
          ttlDays:
          <input
            type="number"
            value={Math.round((policy.ttlSeconds || 0) / (60 * 60 * 24))}
            onChange={e =>
              setPolicy({ ...policy, ttlSeconds: Number(e.target.value) * 60 * 60 * 24 })
            }
          />
        </label>
      </div>
      <div>
        <label>
          intervalMinutes:
          <input
            type="number"
            value={policy.intervalMinutes || 60}
            onChange={e => setPolicy({ ...policy, intervalMinutes: Number(e.target.value) })}
          />
        </label>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={!!policy.enabled}
            onChange={e => setPolicy({ ...policy, enabled: e.target.checked })}
          />
          Enable auto prune
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <button onClick={runPrune} disabled={loading}>
          Prune now
        </button>
        <button onClick={save} style={{ marginLeft: 8 }}>
          Save policy
        </button>
        <button onClick={load} style={{ marginLeft: 8 }}>
          Refresh
        </button>
      </div>
    </div>
  );
}
