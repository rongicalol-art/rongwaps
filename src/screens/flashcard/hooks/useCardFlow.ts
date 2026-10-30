import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import type { PracticeFlowStatus } from '../../../types/models';
import { audioService } from '../../../services/audioService';
import { playFlowSentence } from '../../../services/audio/sentenceAudio';
import { fetchPackedFlashcardExtras } from '../../../services/contentPacks';
import { useAppStore } from '../../../store/useAppStore';
import { getCardMeaning } from '../../../utils/vocabulary/meaningChoices';

interface UseCardFlowOptions {
  currentCard?: Flashcard;
  currentIndex: number;
  totalCount: number;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  onAdvance: () => void;
  /** Called after the last card: flow goes back to the first and keeps playing. */
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
  const [flowStep, setFlowStep] = useState(0);
  const flowRun = useRef(0);
  const flowFrontDelayMs = useAppStore((state) => state.flowFrontDelayMs);
  const flowBackDelayMs = useAppStore((state) => state.flowBackDelayMs);
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const speakDefinition = useAppStore((state) => state.speakDefinition);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const flowExamples = useAppStore((state) => state.flowExamples);
  const flowSpeakTranslation = useAppStore((state) => state.flowSpeakTranslation);
  const flowRepeatPause = useAppStore((state) => state.flowRepeatPause);
  const characterPreference = useAppStore((state) => state.characterPreference);
  const onAdvanceRef = useRef(onAdvance);
  const onReplayRef = useRef(onReplay);
  const setIsFlippedRef = useRef(setIsFlipped);

  onAdvanceRef.current = onAdvance;
  onReplayRef.current = onReplay;
  setIsFlippedRef.current = setIsFlipped;

  // Pauses the flow state only; the clip already ringing is left to finish.
  const pauseFlow = useCallback(() => {
    flowRun.current++;
    setFlowStatus((status) => status === 'playing' ? 'paused' : status);
  }, []);

  const stopFlow = useCallback(() => {
    flowRun.current++;
    audioService.stop();
    setFlowStatus('idle');
    setIsFlippedRef.current(false);
  }, []);

  const toggleFlow = useCallback(() => {
    if (flowStatus === 'playing') {
      flowRun.current++;
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
    const run = ++flowRun.current;
    const isCancelled = () => cancelled || flowRun.current !== run;
    const wait = (duration: number) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration);
    });
    const runFlowStep = async () => {
      setIsFlippedRef.current(false);
      await wait(220);
      if (isCancelled()) return;

      setIsFlippedRef.current(true);
      await wait(360);
      if (isCancelled()) return;

      await Promise.race([
        audioService.playCard(currentCard, pronunciationRate),
        wait(2800),
      ]);
      if (isCancelled()) return;
      audioService.stop();
      await wait(flowFrontDelayMs);
      if (isCancelled()) return;

      const definition = getCardMeaning(currentCard, simpleDefinitions);
      if (speakDefinition && definition) {
        await audioService.speakText(definition, 'en-US', Math.min(pronunciationRate, 1.1));
      }
      if (isCancelled()) return;

      // The card's best example with a recording (book voice first; never the synthetic voice).
      if (flowExamples) {
        const extras = await fetchPackedFlashcardExtras(currentCard).catch(() => null);
        const example = extras?.examples.filter((item) => item.audio).sort((a, b) => a.rank - b.rank || Number(a.audio?.voice !== 'book') - Number(b.audio?.voice !== 'book'))[0];
        if (isCancelled()) return;
        if (example) {
          await wait(flowFrontDelayMs);
          if (isCancelled()) return;
          await playFlowSentence(example.chinese, example.audio, example.english, characterPreference, {
            speakTranslation: flowSpeakTranslation,
            repeatPause: flowRepeatPause,
            rate: pronunciationRate,
            isCancelled,
          });
          if (isCancelled()) return;
        }
      }
      await wait(flowBackDelayMs);
      if (isCancelled()) return;

      if (currentIndex < totalCount - 1) {
        onAdvanceRef.current();
        setFlowStep((s) => s + 1);
      } else {
        // Flow never ends by itself: flip back to the front and loop to the first card.
        setIsFlippedRef.current(false);
        await wait(320);
        if (isCancelled()) return;
        onReplayRef.current();
        setFlowStep((s) => s + 1);
      }
    };

    runFlowStep();
    return () => {
      cancelled = true;
    };
  }, [characterPreference, currentCard, currentIndex, flowBackDelayMs, flowExamples, flowFrontDelayMs, flowRepeatPause, flowSpeakTranslation, flowStatus, flowStep, pronunciationRate, simpleDefinitions, speakDefinition, totalCount]);

  useEffect(() => () => audioService.stop(), []);

  // Note: the flow deliberately does NOT pause when the document is hidden
  // (tab switch). Timers get throttled by the browser while hidden, so the
  // flow keeps advancing in the background and never resets or replays the
  // current card when the learner returns to the tab.

  return { flowStatus, pauseFlow, stopFlow, toggleFlow };
}
