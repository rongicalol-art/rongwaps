import { useEffect, useRef } from 'react';
import { usePracticePreferencesStore } from '../store/usePracticePreferencesStore';

type AnswerStatus = 'idle' | 'correct' | 'wrong';

interface UsePracticeAnswerAutomationOptions {
  status: AnswerStatus;
  onAdvance: () => void;
  selectedValue?: string | null;
  onCheck?: () => void;
  blocked?: boolean;
  advanceWrong?: boolean;
}

export function usePracticeAnswerAutomation({
  status,
  onAdvance,
  selectedValue,
  onCheck,
  blocked = false,
  advanceWrong = true,
}: UsePracticeAnswerAutomationOptions) {
  const autoAdvanceCorrect = usePracticePreferencesStore((state) => state.autoAdvanceCorrect);
  const autoAdvanceWrong = usePracticePreferencesStore((state) => state.autoAdvanceWrong);
  const correctDelayMs = usePracticePreferencesStore((state) => state.correctDelayMs);
  const wrongDelayMs = usePracticePreferencesStore((state) => state.wrongDelayMs);
  const betweenCardsMs = usePracticePreferencesStore((state) => state.betweenCardsMs);
  const onAdvanceRef = useRef(onAdvance);
  const onCheckRef = useRef(onCheck);

  onAdvanceRef.current = onAdvance;
  onCheckRef.current = onCheck;

  // Only an explicit blocker (e.g. a character breakdown the learner is
  // reading) pauses the auto-advance. Settings and other overlays must NOT
  // stop the flow — the session keeps moving on behind them.
  const isPaused = blocked;

  useEffect(() => {
    if (!selectedValue || status !== 'idle' || isPaused || !onCheckRef.current) return;
    const timer = window.setTimeout(() => onCheckRef.current?.(), 0);
    return () => window.clearTimeout(timer);
  }, [isPaused, selectedValue, status]);

  useEffect(() => {
    if (status === 'idle' || isPaused) return;
    const shouldAdvance = status === 'correct' ? autoAdvanceCorrect : advanceWrong && autoAdvanceWrong;
    if (!shouldAdvance) return;

    const advanceDelay = status === 'correct'
      ? correctDelayMs + betweenCardsMs
      : wrongDelayMs + betweenCardsMs;
    const timer = window.setTimeout(() => onAdvanceRef.current(), advanceDelay);
    return () => window.clearTimeout(timer);
  }, [advanceWrong, autoAdvanceCorrect, autoAdvanceWrong, betweenCardsMs, correctDelayMs, isPaused, status, wrongDelayMs]);
}
