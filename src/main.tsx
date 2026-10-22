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
import { FavoriteButton } from './features/library';
import { audioService } from './services/audioService';
import { useAppStore } from './store/useAppStore';

if (import.meta.env.DEV) startLayoutShiftMonitor();
initializeErrorReporting();

audioService.setDefaultRate(useAppStore.getState().pronunciationRate);
useAppStore.subscribe((state, prevState) => {
  if (state.pronunciationRate !== prevState.pronunciationRate) {
    audioService.setDefaultRate(state.pronunciationRate);
  }
});

registerSentenceLookupHandlers({
  lookupWord: async (word, context) => (await import('./services/sentenceLookupService')).lookupSentenceWord(word, useAppStore.getState().characterPreference, context),
  validateWords: async (words) => (await import('./services/sentenceLookupService')).validateSentenceWords(words),
  segmentText: async (text, words) => (await import('./services/sentenceLookupService')).segmentSentenceText(text, words),
  playAudio: async (word, pinyin) => (await import('./services/sentenceLookupService')).playSentenceWordAudio(word, useAppStore.getState().characterPreference, undefined, pinyin),
  renderActions: (state) => {
    const word = state.info?.headword || state.word;
    return (
      <FavoriteButton
        word={word}
        traditional={word}
        pinyin={state.info?.pinyin}
        definitions={state.info?.definitions || []}
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-full text-white/75 hover:bg-white/10 hover:text-white"
      />
    );
  },
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
