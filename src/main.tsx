import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import {ErrorBoundary} from './lib/widgets/ErrorBoundary';
import { initializeErrorReporting, reportReactError } from './services/errorReporting';
import './index.css';
// The default Chinese face: the course's glyphs ship with the first paint, rarer glyphs follow right after.
import './styles/fonts.generated.css?family=Huninn&slices=core';
import { startLayoutShiftMonitor } from './utils/debug/layoutShiftMonitor';
import { startStaleBuildRecovery } from './utils/browser/staleBuildRecovery';

if (import.meta.env.DEV) startLayoutShiftMonitor();
initializeErrorReporting();
startStaleBuildRecovery();

createRoot(document.getElementById('root')!, {
  onCaughtError: reportReactError,
  onUncaughtError: reportReactError,
  onRecoverableError: reportReactError,
}).render(
  <StrictMode>
    {/* App-level safety net: without a boundary here an uncaught render error
        anywhere in the shell, a study window, or an overlay unmounts the whole
        React root and leaves a blank page with no way back. */}
    <ErrorBoundary fallbackClassName="min-h-[100dvh] p-8">
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <App />
      </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);

// Glyphs outside the course text (dictionary searches, rare names): declared after the first paint so the
// first stylesheet stays small. Their font files load only when such a glyph shows up, as before.
void import('./styles/fonts.generated.css?family=Huninn&slices=rare').catch(() => {}); // Offline: native fonts still draw them.
