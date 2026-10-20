import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import {ErrorBoundary} from './lib/widgets';
import { initializeErrorReporting, reportReactError } from './services/errorReporting';
import './index.css';
import { warmChineseFont } from './utils/browser/fontWarmup';
import { startLayoutShiftMonitor } from './utils/debug/layoutShiftMonitor';
import { registerSentenceLookupHandlers } from './lib/widgets/SmartSentence';
import { lookupSentenceWord, validateSentenceWords, playSentenceWordAudio } from './services/sentenceLookupService';
import { useAppStore } from './store/useAppStore';

if (import.meta.env.DEV) startLayoutShiftMonitor();
warmChineseFont();
initializeErrorReporting();

registerSentenceLookupHandlers({
  lookupWord: (word) => lookupSentenceWord(word, useAppStore.getState().characterPreference),
  validateWords: (words) => validateSentenceWords(words),
  playAudio: (word) => playSentenceWordAudio(word, useAppStore.getState().characterPreference),
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
