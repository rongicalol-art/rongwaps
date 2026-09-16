import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import App from './App.tsx';
import {ErrorBoundary} from './lib/widgets';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* App-level safety net: without a boundary here an uncaught render error
        anywhere in the shell, a study window, or an overlay unmounts the whole
        React root and leaves a blank page with no way back. */}
    <ErrorBoundary fallbackClassName="min-h-[100dvh] p-8">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
