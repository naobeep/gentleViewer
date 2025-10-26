import React, { useState } from 'react';
import logo from '../../icon/512.png';

export default function Header() {
  const [q, setQ] = useState('');

  const onSearch = () => {
    (window as any).electronAPI?.invoke?.('search.run', q);
  };

  return (
    <div className="header-inner">
      <div className="header-left">
        <img src={logo} alt="logo" className="app-logo" />
        <h1 className="app-title">Gentle Viewer</h1>
      </div>

      <div className="header-center">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="ファイルを検索..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
          />
          {q && (
            <button className="search-clear" onClick={() => setQ('')}>
              ✖
            </button>
          )}
        </div>
      </div>

      <div className="header-actions">
        <button title="設定" className="icon-btn">
          ⚙️
        </button>
        <button title="ロック" className="icon-btn">
          🔒
        </button>
        <button title="最小化" className="window-btn">
          ─
        </button>
        <button title="最大化" className="window-btn">
          □
        </button>
        <button title="閉じる" className="window-btn">
          ×
        </button>
      </div>
    </div>
  );
}
