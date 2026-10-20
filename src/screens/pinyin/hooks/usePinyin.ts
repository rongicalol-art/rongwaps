import { useCallback, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { useCardSession } from '../../../hooks/useCardSession';
import { getDeckIdentityKey } from '../../../utils/lesson/lessonPartSelection';
import { getPinyinAnswerVariants, isPinyinAnswerAccepted } from '../../../utils/pinyin/pinyinAnswer';

/** Typing practice for words with a usable pinyin reading. Answers stay local to this session. */
export function usePinyin(activeBookId: number, selectedLessons: number[], isLibraryDeck = false, isReviewDeck = false) {
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const sessionKey = `${getDeckIdentityKey({
    activeBookId, selectedLessons, selectedLessonParts, libraryActiveFolder, isReviewDeck, isLibraryDeck,
  })}:pinyin`;
  const { cards: loadedCards, isLoading, error: loadError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const cards = useMemo(
    () => loadedCards.filter((card) => card.front.trim() && getPinyinAnswerVariants(card.pinyin ?? '').length > 0),
    [loadedCards],
  );

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [results, setResults] = useState<Record<string, boolean>>({});
  const resetAnswer = useCallback(() => {
    setInput('');
    setStatus('idle');
  }, []);

  const session = useCardSession(cards, sessionKey, {
    onSessionReset: resetAnswer,
    onAnswerStateReset: resetAnswer,
    requeueMissed: false,
  });
  const { currentCard, currentIndex, completed, moveTo } = session;

  const check = useCallback(() => {
    if (status !== 'idle' || !currentCard || !input.trim()) return;
    const correct = isPinyinAnswerAccepted(input, currentCard.pinyin);
    setStatus(correct ? 'correct' : 'wrong');
    setResults((current) => currentCard.id in current ? current : { ...current, [currentCard.id]: correct });
  }, [currentCard, input, status]);

  const next = useCallback(() => {
    if (session.advanceOrComplete() === 'advanced') resetAnswer();
  }, [resetAnswer, session]);

  const previous = useCallback(() => {
    if (currentIndex <= 0) return;
    moveTo(currentIndex - 1);
    resetAnswer();
  }, [currentIndex, moveTo, resetAnswer]);

  const restartRound = useCallback(() => {
    setResults({});
    session.resetAll();
  }, [session]);

  const answered = Object.values(results);
  const accuracy = answered.length ? Math.round((answered.filter(Boolean).length / answered.length) * 100) : 100;

  return {
    isLoading,
    loadError,
    playlist: session.activeCards,
    currentCard,
    currentIndex,
    input,
    setInput,
    status,
    check,
    next,
    previous,
    completed,
    accuracy,
    restartRound,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle,
    progressInfo: session.progressInfo,
  };
}
