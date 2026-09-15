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
  onFinishSet?: () => void;
}

export function useCardFlow({
  currentCard,
  currentIndex,
  totalCount,
  setIsFlipped,
  onAdvance,
  onReplay,
  onFinishSet,
}: UseCardFlowOptions) {
  const [flowStatus, setFlowStatus] = useState<PracticeFlowStatus>('idle');
  const [flowStep, setFlowStep] = useState(0);
  const flowFrontDelayMs = usePracticePreferencesStore((state) => state.flowFrontDelayMs);
  const flowBackDelayMs = usePracticePreferencesStore((state) => state.flowBackDelayMs);
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const speakDefinition = usePracticePreferencesStore((state) => state.speakDefinition);
  const onAdvanceRef = useRef(onAdvance);
  const onReplayRef = useRef(onReplay);
  const onFinishSetRef = useRef(onFinishSet);
  const setIsFlippedRef = useRef(setIsFlipped);

  onAdvanceRef.current = onAdvance;
  onReplayRef.current = onReplay;
  onFinishSetRef.current = onFinishSet;
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
      // Unlock audio during the user gesture. Playback waits until reveal.
      audioService.initialize();
    }
    setFlowStatus('playing');
  }, [currentCard, flowStatus]);

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

      setIsFlippedRef.current(true);
      await wait(360);
      if (cancelled) return;

      await Promise.race([
        audioService.play(currentCard.audio, pronunciationRate, currentCard.front),
        wait(2800),
      ]);
      audioService.stop();
      if (cancelled) return;
      await wait(flowFrontDelayMs);
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
        setFlowStep((s) => s + 1);
      } else {
        // Continuous flow mode: do not stop when finishing a set!
        // Smoothly flip card back to front and transition to next part or loop back to card 0.
        setIsFlippedRef.current(false);
        await wait(320);
        if (cancelled) return;
        if (onFinishSetRef.current) {
          onFinishSetRef.current();
        } else {
          onReplayRef.current();
        }
        setFlowStep((s) => s + 1);
      }
    };

    runFlowStep();
    return () => {
      cancelled = true;
      audioService.stop();
    };
  }, [currentCard, currentIndex, flowBackDelayMs, flowFrontDelayMs, flowStatus, flowStep, pronunciationRate, speakDefinition, totalCount]);

  // Note: the flow deliberately does NOT pause when the document is hidden
  // (tab switch). Timers get throttled by the browser while hidden, so the
  // flow keeps advancing in the background and never resets or replays the
  // current card when the learner returns to the tab.

  return { flowStatus, pauseFlow, stopFlow, toggleFlow };
}
