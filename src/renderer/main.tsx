import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // 存在しなければこの行を削除してください

// ensure there's a mount target
let rootEl = document.getElementById('root');
if (!rootEl) {
  rootEl = document.createElement('div');
  rootEl.id = 'root';
  document.body.appendChild(rootEl);
}

// mount App
const root = createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
