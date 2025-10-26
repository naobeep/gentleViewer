import React, { useEffect, useState } from 'react';

type ThumbnailConfig = {
  concurrency?: number;
  ttlSeconds?: number;
  maxSizeBytes?: number;
  [k: string]: any;
};

export default function ThumbnailSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<ThumbnailConfig>({
    concurrency: 2,
    ttlSeconds: 2592000,
    maxSizeBytes: 0,
  });

  const call = async (method: string, ...args: any[]) => {
    const api = (window as any).electronAPI;
    try {
      // try namespaced API first, then fallback to generic invoke
      if (api?.thumbnail && typeof api.thumbnail[method] === 'function') {
        return await api.thumbnail[method](...args);
      }
      if (typeof api?.invoke === 'function') {
        return await api.invoke(`thumbnail.${method}`, ...args);
      }
      // last resort: direct ipc via any helper
      if (typeof api?.invoke === 'function') {
        return await api.invoke(`thumbnail.${method}`, ...args);
      }
      throw new Error('no ipc api available');
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await call('getConfig');
        if (mounted && res?.ok && res.config) {
          setConfig(res.config);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await call('setConfig', config);
      if (res?.ok) setMessage('Saved');
      else setMessage('Save failed: ' + (res?.error ?? 'unknown'));
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleStartManaged = async () => {
    setRunning(true);
    setMessage(null);
    try {
      // paths empty => run for configured scope; pass concurrency in opts to enforce immediately
      const res = await call('startManaged', [], { concurrency: Number(config.concurrency || 2) });
      if (res?.ok) setMessage('Started thumbnail generation');
      else setMessage('Start failed: ' + (res?.error ?? 'unknown'));
    } catch (e) {
      setMessage(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h3>Thumbnail Settings</h3>

      <div>
        <label>
          Concurrency:
          <input
            type="number"
            min={1}
            value={Number(config.concurrency ?? 2)}
            onChange={e =>
              setConfig({ ...config, concurrency: Math.max(1, Number(e.target.value) || 1) })
            }
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <label>
          TTL (days):
          <input
            type="number"
            min={0}
            value={Math.round((config.ttlSeconds ?? 0) / (60 * 60 * 24))}
            onChange={e =>
              setConfig({ ...config, ttlSeconds: Number(e.target.value) * 60 * 60 * 24 })
            }
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <label>
          Max cache (MB):
          <input
            type="number"
            min={0}
            value={Math.round((config.maxSizeBytes ?? 0) / 1024 / 1024)}
            onChange={e =>
              setConfig({ ...config, maxSizeBytes: Number(e.target.value) * 1024 * 1024 })
            }
            style={{ width: 120, marginLeft: 8 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving || loading}>
          Save
        </button>
        <button onClick={handleStartManaged} disabled={running || loading}>
          Start Managed Generation
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            setMessage(null);
            try {
              const info = await call('getConfig');
              setConfig(info.config || config);
              setMessage('Refreshed');
            } catch (e) {
              setMessage(String(e));
            } finally {
              setLoading(false);
            }
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 8, color: '#666' }}>
        {loading && <div>Loading...</div>}
        {saving && <div>Saving...</div>}
        {running && <div>Starting...</div>}
        {message && <div>{message}</div>}
      </div>
    </div>
  );
}
