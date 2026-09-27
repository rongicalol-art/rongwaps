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

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
    onCheckRef.current = onCheck;
  });

  useEffect(() => {
    if (status !== 'correct' || blocked || !autoAdvanceCorrect) return;
    const timer = setTimeout(() => {
      onAdvanceRef.current();
    }, correctDelayMs + betweenCardsMs);
    return () => clearTimeout(timer);
  }, [status, blocked, autoAdvanceCorrect, correctDelayMs, betweenCardsMs]);

  useEffect(() => {
    if (status !== 'wrong' || blocked || !autoAdvanceWrong || !advanceWrong) return;
    const timer = setTimeout(() => {
      onAdvanceRef.current();
    }, wrongDelayMs + betweenCardsMs);
    return () => clearTimeout(timer);
  }, [status, blocked, autoAdvanceWrong, advanceWrong, wrongDelayMs, betweenCardsMs]);

  useEffect(() => {
    if (status !== 'idle' || blocked || !selectedValue || !onCheckRef.current) return;
    onCheckRef.current();
  }, [status, blocked, selectedValue]);
}
