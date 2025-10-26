import React from 'react';

export default function Sidebar() {
  return (
    <div className="sidebar-inner">
      <div className="quick-access">
        <div className="qa-title">クイックアクセス</div>
        <button className="qa-item">📁 最近追加</button>
        <button className="qa-item">⭐ お気に入り</button>
        <button className="qa-item">🔖 保存済み検索</button>
      </div>

      <div className="tag-section">
        <div className="tag-section-header">
          <input className="tag-search" placeholder="タグを検索..." />
          <button className="tag-add">＋</button>
        </div>

        <div className="tag-list">
          {/* 実データがあれば map して表示 */}
          <div className="tag-item">
            <input type="checkbox" />{' '}
            <span className="tag-color" style={{ background: '#1976d2' }} /> 漫画{' '}
            <span className="tag-count"> (87)</span>
          </div>
          <div className="tag-item">
            <input type="checkbox" />{' '}
            <span className="tag-color" style={{ background: '#4caf50' }} /> イラスト{' '}
            <span className="tag-count"> (125)</span>
          </div>
        </div>

        <div className="tag-footer">
          <label>
            <input type="checkbox" /> 隠しタグを表示
          </label>
        </div>
      </div>
    </div>
  );
}
