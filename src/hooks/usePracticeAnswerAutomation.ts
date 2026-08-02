import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
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
  const instantChoiceCheck = usePracticePreferencesStore((state) => state.instantChoiceCheck);
  const autoAdvanceCorrect = usePracticePreferencesStore((state) => state.autoAdvanceCorrect);
  const autoAdvanceWrong = usePracticePreferencesStore((state) => state.autoAdvanceWrong);
  const correctDelayMs = usePracticePreferencesStore((state) => state.correctDelayMs);
  const wrongDelayMs = usePracticePreferencesStore((state) => state.wrongDelayMs);
  const betweenCardsMs = usePracticePreferencesStore((state) => state.betweenCardsMs);
  const isOverlayOpen = useAppStore((state) => state.isOverlayOpen);
  const onAdvanceRef = useRef(onAdvance);
  const onCheckRef = useRef(onCheck);

  onAdvanceRef.current = onAdvance;
  onCheckRef.current = onCheck;

  const isPaused = blocked || isOverlayOpen;

  useEffect(() => {
    if (!instantChoiceCheck || !selectedValue || status !== 'idle' || isPaused || !onCheckRef.current) return;
    const timer = window.setTimeout(() => onCheckRef.current?.(), 0);
    return () => window.clearTimeout(timer);
  }, [instantChoiceCheck, isPaused, selectedValue, status]);

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
