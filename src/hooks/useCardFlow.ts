import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import type { PracticeFlowStatus } from '../types/models';
import { audioService } from '../services/audioService';
import { usePracticePreferencesStore } from '../store/usePracticePreferencesStore';

interface UseCardFlowOptions {
  currentCard?: Flashcard;
  currentIndex: number;
  totalCount: number;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  onAdvance: () => void;
  onReplay: () => void;
}

export function useCardFlow({
  currentCard,
  currentIndex,
  totalCount,
  setIsFlipped,
  onAdvance,
  onReplay,
}: UseCardFlowOptions) {
  const [flowStatus, setFlowStatus] = useState<PracticeFlowStatus>('idle');
  const flowFrontDelayMs = usePracticePreferencesStore((state) => state.flowFrontDelayMs);
  const flowBackDelayMs = usePracticePreferencesStore((state) => state.flowBackDelayMs);
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const speakDefinition = usePracticePreferencesStore((state) => state.speakDefinition);
  const onAdvanceRef = useRef(onAdvance);
  const onReplayRef = useRef(onReplay);
  const setIsFlippedRef = useRef(setIsFlipped);
  const userGestureAudioRef = useRef<Promise<void> | null>(null);

  onAdvanceRef.current = onAdvance;
  onReplayRef.current = onReplay;
  setIsFlippedRef.current = setIsFlipped;

  const pauseFlow = useCallback(() => {
    setFlowStatus((status) => status === 'playing' ? 'paused' : status);
    audioService.stop();
  }, []);

  const stopFlow = useCallback(() => {
    audioService.stop();
    setFlowStatus('idle');
    setIsFlippedRef.current(false);
  }, []);

  const toggleFlow = useCallback(() => {
    if (flowStatus === 'playing') {
      audioService.stop();
      setFlowStatus('paused');
      return;
    }
    if (flowStatus === 'finished') {
      onReplayRef.current();
      setIsFlippedRef.current(false);
    } else if (currentCard) {
      // Starting the first pronunciation inside the button gesture is
      // required by Safari's media policy. The effect below adopts it.
      userGestureAudioRef.current = audioService.play(
        currentCard.audio,
        pronunciationRate,
        currentCard.front,
      );
    }
    audioService.initialize();
    setFlowStatus('playing');
  }, [currentCard, flowStatus, pronunciationRate]);

  useEffect(() => {
    if (flowStatus !== 'playing' || !currentCard) return;

    let cancelled = false;
    const wait = (duration: number) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration);
    });
    const runFlowStep = async () => {
      setIsFlippedRef.current(false);
      await wait(220);
      if (cancelled) return;

      const userGestureAudio = userGestureAudioRef.current;
      userGestureAudioRef.current = null;
      await Promise.race([
        userGestureAudio || audioService.play(currentCard.audio, pronunciationRate, currentCard.front),
        wait(2800),
      ]);
      audioService.stop();
      if (cancelled) return;
      await wait(flowFrontDelayMs);
      if (cancelled) return;

      setIsFlippedRef.current(true);
      await wait(360);
      if (cancelled) return;

      if (speakDefinition && currentCard.back) {
        await Promise.race([
          audioService.speakText(currentCard.back, 'en-US', Math.min(pronunciationRate, 1.1)),
          wait(3000),
        ]);
        audioService.stop();
      }
      if (cancelled) return;
      await wait(flowBackDelayMs);
      if (cancelled) return;

      if (currentIndex < totalCount - 1) {
        onAdvanceRef.current();
      } else {
        setFlowStatus('finished');
      }
    };

    runFlowStep();
    return () => {
      cancelled = true;
      audioService.stop();
    };
  }, [currentCard, currentIndex, flowBackDelayMs, flowFrontDelayMs, flowStatus, pronunciationRate, speakDefinition, totalCount]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) pauseFlow();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      audioService.stop();
    };
  }, [pauseFlow]);

  return { flowStatus, pauseFlow, stopFlow, toggleFlow };
}
