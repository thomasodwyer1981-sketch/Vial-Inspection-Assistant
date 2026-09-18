import { createRoot } from 'react-dom/client';

import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import { hydratePersistentStorage } from './utils/storage';
import App from './App';

import './index.css';

// Defer both inits until after the first frame — avoids blocking the WebView
// startup path (ANR risk) and keeps cold-launch time minimal.
requestAnimationFrame(() => {
  initSentry();
  initAnalytics();
});

void hydratePersistentStorage().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
