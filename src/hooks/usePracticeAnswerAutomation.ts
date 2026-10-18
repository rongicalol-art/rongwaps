import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

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
  const autoAdvanceCorrect = useAppStore((state) => state.autoAdvanceCorrect);
  const autoAdvanceWrong = useAppStore((state) => state.autoAdvanceWrong);
  const correctDelayMs = useAppStore((state) => state.correctDelayMs);
  const wrongDelayMs = useAppStore((state) => state.wrongDelayMs);
  const betweenCardsMs = useAppStore((state) => state.betweenCardsMs);
  const onAdvanceRef = useRef(onAdvance);
  const onCheckRef = useRef(onCheck);
  const statusStartedAtRef = useRef(Date.now());
  const prevStatusRef = useRef<AnswerStatus>(status);

  if (prevStatusRef.current !== status) {
    prevStatusRef.current = status;
    statusStartedAtRef.current = Date.now();
  }

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
    onCheckRef.current = onCheck;
  });

  useEffect(() => {
    if (status !== 'correct' || blocked || !autoAdvanceCorrect) return;
    const elapsed = Date.now() - statusStartedAtRef.current;
    const delay = Math.max(0, correctDelayMs + betweenCardsMs - elapsed);
    const timer = setTimeout(() => {
      onAdvanceRef.current();
    }, delay);
    return () => clearTimeout(timer);
  }, [status, blocked, autoAdvanceCorrect, correctDelayMs, betweenCardsMs]);

  useEffect(() => {
    if (status !== 'wrong' || blocked || !autoAdvanceWrong || !advanceWrong) return;
    const elapsed = Date.now() - statusStartedAtRef.current;
    const delay = Math.max(0, wrongDelayMs + betweenCardsMs - elapsed);
    const timer = setTimeout(() => {
      onAdvanceRef.current();
    }, delay);
    return () => clearTimeout(timer);
  }, [status, blocked, autoAdvanceWrong, advanceWrong, wrongDelayMs, betweenCardsMs]);

  useEffect(() => {
    if (status !== 'idle' || blocked || !selectedValue || !onCheckRef.current) return;
    onCheckRef.current();
  }, [status, blocked, selectedValue]);
}
