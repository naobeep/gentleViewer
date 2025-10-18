import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ensure #root exists and mount App
let container = document.getElementById('root');
if (!container) {
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
