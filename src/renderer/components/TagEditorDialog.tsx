import React, { useEffect, useState } from 'react';

type Tag = { id: string | number; name: string; color?: string };
type Props = {
  open: boolean;
  filePath?: string; // 指定するとファイルへのタグ付与UIを有効化
  onClose?: () => void;
  onChange?: (tags: Tag[]) => void;
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

export default function TagEditorDialog({ open, filePath, onClose, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [fileTagIds, setFileTagIds] = useState<Set<string | number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ffd966');
  const [editing, setEditing] = useState<Record<string, { name: string; color: string }>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const t = (await apiTry<Tag[]>(['getTags', 'tags.list', 'tagsGet'])) || [];
        setTags(Array.isArray(t) ? t : []);
        if (filePath) {
          const ft =
            (await apiTry<string[] | number[]>(
              ['getFileTags', 'tags.getForFile', 'tags.getByFile'],
              filePath
            )) || [];
          setFileTagIds(new Set(ft as (string | number)[]));
        }
      } catch (e) {
        console.warn('TagEditor: load failure', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, filePath]);

  const refresh = async () => {
    const t = (await apiTry<Tag[]>(['getTags', 'tags.list', 'tagsGet'])) || [];
    setTags(Array.isArray(t) ? t : []);
  };

  const createTag = async () => {
    if (!newName.trim()) return;
    const created = await apiTry<Tag>(['createTag', 'tags.create'], {
      name: newName.trim(),
      color: newColor,
    }).catch(() => null);
    if (created) {
      setNewName('');
      setNewColor('#ffd966');
      await refresh();
    } else {
      // try optimistic local id
      await refresh();
    }
  };

  const startEdit = (t: Tag) => {
    setEditing(s => ({ ...s, [t.id]: { name: t.name, color: t.color || '#ffd966' } }));
  };
  const cancelEdit = (id: string | number) => {
    setEditing(s => {
      const c = { ...s };
      delete c[id];
      return c;
    });
  };
  const saveEdit = async (id: string | number) => {
    const ed = editing[id];
    if (!ed) return;
    await apiTry(['updateTag', 'tags.update'], { id, name: ed.name.trim(), color: ed.color }).catch(
      () => null
    );
    cancelEdit(id);
    await refresh();
  };

  const removeTag = async (id: string | number) => {
    if (!confirm('タグを削除しますか？ 削除するとファイル付与情報も消えます。')) return;
    await apiTry(['deleteTag', 'tags.delete'], id).catch(() => null);
    // update local view
    await refresh();
    if (filePath) {
      setFileTagIds(s => {
        const ns = new Set(s);
        ns.delete(id);
        return ns;
      });
      // sync file tags if API exists
      await apiTry(['setFileTags', 'tags.setForFile'], filePath, Array.from(fileTagIds)).catch(
        () => null
      );
    }
  };

  const toggleFileTag = async (id: string | number) => {
    const ns = new Set(fileTagIds);
    if (ns.has(id)) ns.delete(id);
    else ns.add(id);
    setFileTagIds(ns);
    // push to backend if available
    if (filePath) {
      await apiTry(
        ['setFileTags', 'tags.setForFile', 'tags.attachToFile'],
        filePath,
        Array.from(ns)
      ).catch(() => null);
      // notify parent
      if (onChange) {
        const assigned = tags.filter(t => ns.has(t.id));
        onChange(assigned);
      }
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
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 760,
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
            gap: 8,
          }}
        >
          <strong>タグ編集</strong>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              onClose?.();
            }}
          >
            閉じる
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: 12, flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              width: 360,
              borderRight: '1px solid #f1f1f1',
              paddingRight: 12,
              overflow: 'auto',
            }}
          >
            <div style={{ marginBottom: 8, fontSize: 13, color: '#444' }}>既存タグ</div>
            {loading && <div>読み込み中…</div>}
            {!loading && tags.length === 0 && <div style={{ color: '#999' }}>タグがありません</div>}
            {tags.map(t => {
              const ed = editing[t.id];
              return (
                <div
                  key={String(t.id)}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px dashed #f4f4f4',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      background: ed ? ed.color : t.color || '#ffd966',
                      borderRadius: 4,
                      border: '1px solid #ccc',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    {ed ? (
                      <input
                        value={ed.name}
                        onChange={e =>
                          setEditing(s => ({ ...s, [t.id]: { ...s[t.id], name: e.target.value } }))
                        }
                      />
                    ) : (
                      <div style={{ fontSize: 14 }}>{t.name}</div>
                    )}
                  </div>
                  <div>
                    {ed ? (
                      <>
                        <input
                          type="color"
                          value={ed.color}
                          onChange={e =>
                            setEditing(s => ({
                              ...s,
                              [t.id]: { ...s[t.id], color: e.target.value },
                            }))
                          }
                        />
                        <button onClick={() => saveEdit(t.id)}>保存</button>
                        <button onClick={() => cancelEdit(t.id)}>キャンセル</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(t)}>編集</button>
                        <button onClick={() => removeTag(t.id)} style={{ color: '#b00' }}>
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>タグ作成</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="タグ名"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} />
                <button onClick={createTag}>作成</button>
                <button onClick={refresh}>再読込</button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: 8, flex: 1, overflow: 'auto' }}>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>
                ファイルへのタグ（{filePath ? filePath.split(/[\\/]/).pop() : '未指定'}）
              </div>
              {!filePath && (
                <div style={{ color: '#999' }}>ファイルパスを指定するとここで割当が可能です。</div>
              )}
              {filePath && tags.length === 0 && (
                <div style={{ color: '#999' }}>まずタグを作成してください</div>
              )}
              {filePath &&
                tags.map(t => (
                  <label
                    key={String(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}
                  >
                    <input
                      type="checkbox"
                      checked={fileTagIds.has(t.id)}
                      onChange={() => toggleFileTag(t.id)}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          background: t.color || '#ffd966',
                          borderRadius: 3,
                          display: 'inline-block',
                          border: '1px solid #ccc',
                        }}
                      />
                      <span>{t.name}</span>
                    </span>
                  </label>
                ))}
            </div>
          </div>
        </div>

        <div style={{ padding: 10, borderTop: '1px solid #eee', textAlign: 'right' }}>
          <button
            onClick={() => {
              onClose?.();
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
