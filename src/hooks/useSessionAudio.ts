import { useEffect } from 'react';
import type { Flashcard } from '../data/flashcards';
import { audioService } from '../services/audioService';

// How many upcoming cards (without recorded audio) get neural TTS pre-warmed
// so their first play uses the good voice instead of browser speech.
const NEURAL_PRELOAD_AHEAD = 2;

/** Pre-warm neural TTS for upcoming cards without recorded audio. */
export function useNeuralPrewarm(playlist: Flashcard[], currentIndex: number) {
  useEffect(() => {
    if (playlist.length === 0 || currentIndex < 0) return;
    const fronts = playlist
      .slice(currentIndex, currentIndex + NEURAL_PRELOAD_AHEAD)
      .filter((card) => !audioService.isAudioFileName(card.audio))
      .map((card) => card.front?.trim())
      .filter((text): text is string => Boolean(text));
    if (fronts.length > 0) {
      audioService.preloadNeural(fronts, undefined, { limit: NEURAL_PRELOAD_AHEAD }).catch(() => {});
    }
  }, [playlist, currentIndex]);
}

/**
 * Preload the deck's recorded audio and stop playback only when the session
 * completes or unmounts — never on card advance, so the correct-answer
 * pronunciation keeps ringing through the transition.
 */
export function useDeckAudioLifecycle(activeCards: Flashcard[], completed: boolean) {
  useEffect(() => {
    if (activeCards.length > 0) audioService.preload(activeCards.map((c) => c.audio));
  }, [activeCards]);

  useEffect(() => () => audioService.stop(), [completed]);
}
