import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// ── PWA auto-update ───────────────────────────────────────────────────────────
// When the service worker updates and takes control (controllerchange), reload
// the page so the app picks up the new precached JS/CSS bundle. This is what
// makes "autoUpdate" mode actually work in standalone / home-screen installs
// where the user never fully closes the app.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
