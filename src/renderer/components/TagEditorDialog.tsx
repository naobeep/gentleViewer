import React, { useEffect, useState } from 'react';

type Tag = { id: string; name: string; color?: string };

async function callTag(method: string, ...args: any[]) {
  const api = (window as any).electronAPI;
  try {
    if (api?.tag && typeof api.tag[method] === 'function') {
      return await api.tag[method](...args);
    }
    if (typeof api?.invoke === 'function') {
      return await api.invoke(`tag.${method}`, ...args);
    }
    throw new Error('tag api not available');
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export default function TagEditorDialog({
  open,
  onClose,
  filePaths,
}: {
  open: boolean;
  onClose: () => void;
  filePaths?: string[]; // 選択ファイルにタグを付ける場合に渡す
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#cccccc');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await callTag('getAll');
      if (mounted && res?.ok) {
        setTags(res.tags || res.data || []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    // if filePaths provided, try to load assigned tags for first file (or multiple)
    (async () => {
      if (!open || !filePaths || filePaths.length === 0) return;
      const res = await callTag('getForFiles', filePaths);
      if (res?.ok) {
        const assigned: string[] = res.tagIds || res.ids || [];
        const map: Record<string, boolean> = {};
        for (const id of assigned) map[id] = true;
        setSelectedIds(map);
      }
    })();
  }, [open, filePaths]);

  const refresh = async () => {
    setLoading(true);
    const res = await callTag('getAll');
    if (res?.ok) setTags(res.tags || res.data || []);
    setLoading(false);
  };

  const createTag = async () => {
    if (!newName.trim()) return;
    const res = await callTag('create', { name: newName.trim(), color: newColor });
    if (res?.ok) {
      setNewName('');
      await refresh();
    } else {
      console.error('create tag failed', res);
    }
  };

  const updateTag = async (id: string, patch: Partial<Tag>) => {
    const res = await callTag('update', id, patch);
    if (res?.ok) await refresh();
  };

  const deleteTag = async (id: string) => {
    if (!confirm('タグを削除しますか？')) return;
    const res = await callTag('delete', id);
    if (res?.ok) await refresh();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(s => ({ ...s, [id]: !s[id] }));
  };

  const applyToFiles = async () => {
    if (!filePaths || filePaths.length === 0) {
      alert('タグを割り当てるファイルが指定されていません。');
      return;
    }
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    const res = await callTag('assignMultiple', filePaths, ids);
    if (res?.ok) {
      alert('タグを適用しました');
      onClose();
    } else {
      alert('タグ適用に失敗しました: ' + (res?.error ?? 'unknown'));
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: 640,
          maxHeight: '80vh',
          overflow: 'auto',
          background: '#fff',
          padding: 16,
          borderRadius: 6,
        }}
      >
        <h3>タグ編集</h3>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            placeholder="新しいタグ名"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} />
          <button onClick={createTag}>追加</button>
          <button onClick={refresh}>更新</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          {loading ? (
            <div>読み込み中...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>選択</th>
                  <th>名前</th>
                  <th>カラー</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(t => (
                  <tr key={t.id}>
                    <td style={{ width: 80 }}>
                      <input
                        type="checkbox"
                        checked={!!selectedIds[t.id]}
                        onChange={() => toggleSelect(t.id)}
                      />
                    </td>
                    <td>
                      <input
                        defaultValue={t.name}
                        onBlur={e => updateTag(t.id, { name: e.currentTarget.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="color"
                        defaultValue={t.color || '#cccccc'}
                        onChange={e => updateTag(t.id, { color: e.currentTarget.value })}
                      />
                    </td>
                    <td>
                      <button onClick={() => deleteTag(t.id)} style={{ color: 'crimson' }}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>閉じる</button>
          <button onClick={applyToFiles} disabled={!filePaths || filePaths.length === 0}>
            選択ファイルに適用
          </button>
        </div>
      </div>
    </div>
  );
}
