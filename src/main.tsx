import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import {ErrorBoundary} from './lib/widgets/ErrorBoundary';
import { initializeErrorReporting, reportReactError } from './services/errorReporting';
import './index.css';
import './styles/fonts.generated.css?family=Huninn';
import { startLayoutShiftMonitor } from './utils/debug/layoutShiftMonitor';
import { registerSentenceLookupHandlers } from './lib/widgets/SmartSentence';
import { useAppStore } from './store/useAppStore';

if (import.meta.env.DEV) startLayoutShiftMonitor();
initializeErrorReporting();

registerSentenceLookupHandlers({
  lookupWord: async (word) => (await import('./services/sentenceLookupService')).lookupSentenceWord(word, useAppStore.getState().characterPreference),
  validateWords: async (words) => (await import('./services/sentenceLookupService')).validateSentenceWords(words),
  playAudio: async (word) => (await import('./services/sentenceLookupService')).playSentenceWordAudio(word, useAppStore.getState().characterPreference),
});

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
