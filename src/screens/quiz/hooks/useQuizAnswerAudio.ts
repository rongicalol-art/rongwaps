import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';

const MAX_ANSWER_AUDIO_HOLD_MS = 1800;

/** Tracks the latest answer's audio; an earlier clip cannot unlock Continue. */
export function useQuizAnswerAudio() {
  const rate = useAppStore((state) => state.pronunciationRate);
  const replay = useAppStore((state) => state.replayAudioAfterAnswer);
  const [answerAudioPlaying, setPlaying] = useState(false);
  const generation = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAnswerAudio = useCallback(() => {
    generation.current += 1;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => () => {
    generation.current += 1;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const playWord = useCallback((card: Flashcard) => {
    if (!replay) return;
    const id = ++generation.current;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setPlaying(true);
    const finish = () => {
      if (generation.current !== id) return;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPlaying(false);
    };
    timerRef.current = setTimeout(finish, MAX_ANSWER_AUDIO_HOLD_MS);
    void audioService.playCard(card, rate).then(finish, finish);
  }, [rate, replay]);

  return { answerAudioPlaying, playWord, stopAnswerAudio };
}
