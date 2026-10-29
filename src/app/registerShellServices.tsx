import { registerSentenceLookupHandlers } from '../lib/widgets';
import { FavoriteButton } from '../features/library';
import { audioService } from '../services/audioService';
import { useAppStore } from '../store/useAppStore';

/**
 * Wiring only the signed-in shell needs. Kept out of `main.tsx` so the sign-in
 * screen's first download does not carry the audio stack and flashcard service.
 */
export function registerShellServices(): void {
  audioService.setDefaultRate(useAppStore.getState().pronunciationRate);
  useAppStore.subscribe((state, prevState) => {
    if (state.pronunciationRate !== prevState.pronunciationRate) {
      audioService.setDefaultRate(state.pronunciationRate);
    }
  });

  registerSentenceLookupHandlers({
    lookupWord: async (word, context) => (await import('../services/sentenceLookupService')).lookupSentenceWord(word, useAppStore.getState().characterPreference, context),
    validateWords: async (words) => (await import('../services/sentenceLookupService')).validateSentenceWords(words),
    segmentText: async (text, words) => (await import('../services/sentenceLookupService')).segmentSentenceText(text, words),
    playAudio: async (word, pinyin) => (await import('../services/sentenceLookupService')).playSentenceWordAudio(word, useAppStore.getState().characterPreference, undefined, pinyin),
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
}
