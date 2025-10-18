import React, { useEffect, useState } from 'react';

type Tag = { id: string; name: string; color?: string | null; description?: string | null };

export const TagManager: React.FC<{ onSelectTag?: (tag: Tag) => void }> = ({ onSelectTag }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1976d2');

  const load = async () => {
    try {
      const res = await (window as any).electronAPI.getTags();
      setTags(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await (window as any).electronAPI.createTag({ name: name.trim(), color });
      setName('');
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('タグを削除しますか？')) return;
    try {
      await (window as any).electronAPI.deleteTag(id);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="新しいタグ名" />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <button onClick={create}>作成</button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tags.map(t => (
          <li key={t.id} style={{ padding: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{ width: 12, height: 12, background: t.color || '#ccc', borderRadius: 3 }}
            />
            <div
              style={{ flex: 1, cursor: 'pointer' }}
              onClick={() => onSelectTag && onSelectTag(t)}
            >
              {t.name}
            </div>
            <button onClick={() => remove(t.id)} style={{ fontSize: 12 }}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TagManager;
