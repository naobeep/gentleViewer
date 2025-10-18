import React, { useState } from 'react';

export const SearchBar: React.FC<{ onResults?: (rows: any[]) => void }> = ({ onResults }) => {
  const [q, setQ] = useState('');

  const run = async () => {
    try {
      const rows = await (window as any).electronAPI.searchFiles({ text: q, limit: 200 });
      if (onResults) onResults(rows);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="検索ワード（FTS）"
        style={{ flex: 1 }}
      />
      <button onClick={run}>検索</button>
    </div>
  );
};

export default SearchBar;
