import { createRoot } from 'react-dom/client';

import { initSentry } from './lib/sentry';
import App from './App';

import './index.css';

// Must run before React renders so all subsequent errors are captured
initSentry();

createRoot(document.getElementById('root')!).render(<App />);
