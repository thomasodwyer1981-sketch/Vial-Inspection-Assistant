import { createRoot } from 'react-dom/client';

import { initSentry } from './lib/sentry';
import App from './App';

import './index.css';

// Defer Sentry init until after the first frame so it doesn't block the
// WebView's synchronous startup path (which causes ANR on slow/cold launches).
// Errors thrown synchronously during the very first render are extremely rare;
// the tiny window of non-coverage is an acceptable trade-off vs. ANR risk.
requestAnimationFrame(() => { initSentry(); });

createRoot(document.getElementById('root')!).render(<App />);
