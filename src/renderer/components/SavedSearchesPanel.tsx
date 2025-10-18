import React, { useEffect, useState } from 'react';
import { SavedSearch, SearchQuery } from '../../shared/types/thumbnail';

const generateId = () => Math.random().toString(36).slice(2, 10);

const formatDuration = (sec: number) => {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${s}秒`;
};

const getTagName = (id: number) => `#${id}`; // プロジェクトのタグ名解決に差し替え

const formatSearchQuery = (query: SearchQuery) => {
  const parts: string[] = [];
  if (query.tags?.include?.length) {
    parts.push(`タグ: ${query.tags.include.map(getTagName).join(', ')}`);
  }
  if (query.fileTypes?.length) {
    parts.push(`形式: ${query.fileTypes.join(', ')}`);
  }
  if (query.archivePageRange) {
    const [min, max] = query.archivePageRange;
    parts.push(`ページ数: ${min}〜${max}`);
  }
  if (query.durationRange) {
    const [min, max] = query.durationRange;
    parts.push(`長さ: ${formatDuration(min)}〜${formatDuration(max)}`);
  }
  return parts.join(', ');
};

const useCurrentSearchQuery = (): SearchQuery => {
  // 実装環境に合わせ取得処理を差し替えてください
  return {
    tags: { include: [], exclude: [], any: [] },
    fileTypes: [],
  };
};

export const SavedSearchesPanel: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // electronAPI が無い場合は空配列でフォールバック（開発時）
    if (typeof window === 'undefined' || !(window as any).electronAPI || !window.electronAPI.getSavedSearches) {
      setSearches([]);
      return;
    }

    window.electronAPI.getSavedSearches().then(setSearches).catch(() => setSearches([]));
  }, [isOpen]);

  const handleExecute = async (search: SavedSearch) => {
    if (!window.electronAPI || !window.electronAPI.executeSearch) {
      console.warn('electronAPI.executeSearch is not available (dev mode)');
      return;
    }
    await window.electronAPI.executeSearch(search.query);
    if (window.electronAPI.updateSearchExecutionCount) {
      await window.electronAPI.updateSearchExecutionCount(search.id);
    }
    setSearches(prev => prev.map(s => s.id === search.id ? { ...s, executionCount: (s.executionCount||0)+1, lastExecuted: new Date().toISOString() } : s));
  };

  if (!isOpen) return null;

  return (
    <div className="saved-searches-panel">
      <div className="panel-header">
        <h3>保存済み検索</h3>
        <div className="header-actions">
          <button onClick={() => setShowSaveDialog(true)}>+ 新規保存</button>
          <button onClick={onClose}>×</button>
        </div>
      </div>

      <div className="panel-content">
        {searches.length > 0 ? (
          <div className="search-list">
            {searches.filter(s => s.isPinned).map(search => (
              <div key={search.id} className="saved-search-item" onClick={() => handleExecute(search)}>
                <div className="search-icon">{search.icon}</div>
                <div className="search-info">
                  <div className="search-name">
                    {search.isFavorite && <span>⭐</span>}
                    <span>{search.name}</span>
                  </div>
                  <div className="search-query">{formatSearchQuery(search.query)}</div>
                  <div className="search-meta">実行回数: {search.executionCount}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-searches">
            <p>保存済み検索がありません</p>
            <button onClick={() => setShowSaveDialog(true)}>検索条件を保存</button>
          </div>
        )}
      </div>

      {showSaveDialog && <SaveSearchDialog onClose={() => setShowSaveDialog(false)} onSaved={(s) => { setSearches(prev => [...prev, s]); setShowSaveDialog(false); }} />}
    </div>
  );
};

const SaveSearchDialog: React.FC<{ onClose: () => void; onSaved: (s: SavedSearch) => void; }> = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(true);
  const currentQuery = useCurrentSearchQuery();

  const handleSave = async () => {
    const search: SavedSearch = {
      id: generateId(),
      name,
      icon,
      query: currentQuery,
      isFavorite,
      isPinned,
      createdAt: new Date().toISOString(),
      lastExecuted: null,
      executionCount: 0,
    };
    await window.electronAPI.saveSavedSearch(search);
    onSaved(search);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog save-search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>検索条件を保存</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="dialog-content">
          <div className="form-group">
            <label>検索名</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 未読漫画" autoFocus />
          </div>
          <div className="current-query">
            <h4>現在の検索条件:</h4>
            <div className="query-preview">{formatSearchQuery(currentQuery)}</div>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={isFavorite} onChange={e => setIsFavorite(e.target.checked)} /> お気に入りに追加</label>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} /> サイドバーに固定表示</label>
          </div>
          <div className="form-group">
            <label>アイコン</label>
            <select value={icon} onChange={(e) => setIcon(e.target.value)}>
              <option value="📚">📚 書籍</option>
              <option value="🎬">🎬 動画</option>
              <option value="🎨">🎨 イラスト</option>
              <option value="📷">📷 写真</option>
              <option value="🎵">🎵 音楽</option>
              <option value="⭐">⭐ お気に入り</option>
            </select>
          </div>
        </div>
        <div className="dialog-footer">
          <button onClick={onClose}>キャンセル</button>
          <button className="primary" onClick={handleSave} disabled={!name.trim()}>保存</button>
        </div>
      </div>
    </div>
  );
};
