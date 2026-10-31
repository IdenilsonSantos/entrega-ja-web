import '@fontsource/sen/400.css';
import '@fontsource/sen/700.css';
import '@fontsource/sen/800.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './lib/push';

registerServiceWorker();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
