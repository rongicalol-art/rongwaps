import { useCallback, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';

/** Tracks the latest answer's audio; an earlier clip cannot unlock Continue. */
export function useQuizAnswerAudio() {
  const rate = useAppStore((state) => state.pronunciationRate);
  const replay = useAppStore((state) => state.replayAudioAfterAnswer);
  const [answerAudioPlaying, setPlaying] = useState(false);
  const generation = useRef(0);

  const playWord = useCallback((card: Flashcard) => {
    if (!replay) return;
    const id = ++generation.current;
    setPlaying(true);
    const finish = () => { if (generation.current === id) setPlaying(false); };
    void audioService.playCard(card, rate).then(finish, finish);
  }, [rate, replay]);

  return { answerAudioPlaying, playWord };
}
