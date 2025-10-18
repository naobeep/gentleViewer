import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThumbnailProgressIndicator } from './components/ThumbnailProgressIndicator';
import { SavedSearchesPanel } from './components/SavedSearchesPanel';

const App: React.FC = () => {
  // 簡易レイアウト。必要に応じてルーター等へ差し替えてください。
  return (
    <div style={{ padding: 16 }}>
      <h1>gentleViewer (dev)</h1>
      <div style={{ marginBottom: 16 }}>
        <ThumbnailProgressIndicator />
      </div>
      <SavedSearchesPanel isOpen={true} onClose={() => {}} />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}