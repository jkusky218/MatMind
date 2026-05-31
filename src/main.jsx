import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// ── PWA update detection ──────────────────────────────────────────────────────
// When a new service worker takes control, dispatch a custom event so the app
// can show a non-intrusive "Update available" banner instead of auto-reloading
// mid-session. The user taps the banner when they're ready to refresh.
if ('serviceWorker' in navigator) {
  let notified = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!notified) {
      notified = true;
      window.dispatchEvent(new Event('pwa-updated'));
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
