import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { ThemeProvider } from '@/contexts/ThemeContext';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found. Ensure index.html has an element with id="root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
);
