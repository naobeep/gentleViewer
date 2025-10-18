import React, { useEffect, useState } from 'react';
import '../styles/screenDesign.css';
import type { SavedSearch, SearchQuery } from '../../shared/types/thumbnail';

const generateId = () => Math.random().toString(36).slice(2, 10);

export const SavedSearchesPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!window.electronAPI || !window.electronAPI.getSavedSearches) {
      setSearches([]);
      return;
    }
    window.electronAPI
      .getSavedSearches()
      .then(setSearches)
      .catch(() => setSearches([]));
  }, [isOpen]);

  const handleExecute = async (s: SavedSearch) => {
    if (!window.electronAPI || !window.electronAPI.executeSearch) return;
    await window.electronAPI.executeSearch(s.query);
    if (window.electronAPI.updateSearchExecutionCount) {
      await window.electronAPI.updateSearchExecutionCount(s.id);
    }
    setSearches(prev =>
      prev.map(p =>
        p.id === s.id
          ? {
              ...p,
              executionCount: (p.executionCount || 0) + 1,
              lastExecuted: new Date().toISOString(),
            }
          : p
      )
    );
  };

  if (!isOpen) return null;

  return (
    <aside className="ss-panel">
      <div className="ss-header">
        <h3>保存済み検索</h3>
        <div className="ss-actions">
          <button onClick={() => setShowSaveDialog(true)}>＋ 新規保存</button>
          <button onClick={onClose}>×</button>
        </div>
      </div>

      <div className="ss-content">
        {searches.length === 0 ? (
          <div className="ss-empty">
            <p>保存済み検索がありません</p>
            <button onClick={() => setShowSaveDialog(true)}>検索条件を保存</button>
          </div>
        ) : (
          <>
            <div className="ss-pinned">
              {searches
                .filter(s => s.isPinned)
                .map(s => (
                  <div key={s.id} className="ss-item" onClick={() => handleExecute(s)}>
                    <div className="ss-icon">{s.icon}</div>
                    <div className="ss-meta">
                      <div className="ss-name">
                        {s.isFavorite && <span className="favorite">★</span>}
                        <span>{s.name}</span>
                      </div>
                      <div className="ss-query">{s.query?.fileTypes?.join(', ') || '-'}</div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="ss-list">
              {searches
                .filter(s => !s.isPinned)
                .map(s => (
                  <div key={s.id} className="ss-item" onClick={() => handleExecute(s)}>
                    <div className="ss-icon">{s.icon}</div>
                    <div className="ss-meta">
                      <div className="ss-name">
                        {s.isFavorite && <span className="favorite">★</span>}
                        <span>{s.name}</span>
                      </div>
                      <div className="ss-query">{s.query?.fileTypes?.join(', ') || '-'}</div>
                      <div className="ss-footer">実行回数: {s.executionCount || 0}</div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {showSaveDialog && (
        <SaveSearchDialog
          onClose={() => setShowSaveDialog(false)}
          onSaved={n => setSearches(p => [n, ...p])}
        />
      )}
    </aside>
  );
};

const SaveSearchDialog: React.FC<{ onClose: () => void; onSaved: (s: SavedSearch) => void }> = ({
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(true);

  // フォールバックのダミークエリ（実プロジェクトの検索条件取得に差し替えてください）
  const currentQuery: SearchQuery = {
    tags: { include: [], exclude: [], any: [] },
    fileTypes: [],
  } as any;

  const handleSave = async () => {
    const s: SavedSearch = {
      id: generateId(),
      name,
      icon,
      query: currentQuery,
      isFavorite,
      isPinned,
      createdAt: new Date().toISOString(),
      lastExecuted: null,
      executionCount: 0,
    } as SavedSearch;
    if (window.electronAPI && window.electronAPI.saveSavedSearch) {
      await window.electronAPI.saveSavedSearch(s);
    }
    onSaved(s);
    onClose();
  };

  return (
    <div className="ss-dialog-backdrop" onClick={onClose}>
      <div className="ss-dialog" onClick={e => e.stopPropagation()}>
        <div className="ss-dialog-header">
          <h4>検索条件を保存</h4>
          <button onClick={onClose}>×</button>
        </div>
        <div className="ss-dialog-body">
          <label className="ss-field">
            名前
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 未読漫画"
            />
          </label>

          <label className="ss-field">
            アイコン
            <select value={icon} onChange={e => setIcon(e.target.value)}>
              <option value="📚">📚 書籍</option>
              <option value="🎬">🎬 動画</option>
              <option value="🎨">🎨 イラスト</option>
              <option value="📷">📷 写真</option>
              <option value="🎵">🎵 音楽</option>
            </select>
          </label>

          <label className="ss-field">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={e => setIsFavorite(e.target.checked)}
            />{' '}
            お気に入り
          </label>

          <label className="ss-field">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
            />{' '}
            サイドバーに固定
          </label>
        </div>

        <div className="ss-dialog-footer">
          <button onClick={onClose}>キャンセル</button>
          <button className="primary" onClick={handleSave} disabled={!name.trim()}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
