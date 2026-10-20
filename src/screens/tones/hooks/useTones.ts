import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { useCardSession } from '../../../hooks/useCardSession';
import { getDeckIdentityKey } from '../../../utils/lesson/lessonPartSelection';
import { toneTargets } from '../utils/toneTargets';
import type { ToneAttempt } from '../components/ToneStrip';
import type { ToneTarget } from '../utils/toneTargets';

/**
 * The tone-drawing session: the deck's words that can be drawn (clean pinyin, 1–4 characters),
 * one at a time. Practice only: results stay in the session and never touch SRS.
 */
export function useTones(activeBookId: number, selectedLessons: number[], isLibraryDeck = false, isReviewDeck = false) {
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const autoPlayAudio = useAppStore((state) => state.autoPlayAudio);
  const autoAdvanceCorrect = useAppStore((state) => state.autoAdvanceCorrect);
  const autoAdvanceWrong = useAppStore((state) => state.autoAdvanceWrong);
  // Its own resume key: the tone deck is a filtered subset, so a shared index would point at the wrong word.
  const sessionKey = `${getDeckIdentityKey({
    activeBookId, selectedLessons, selectedLessonParts, libraryActiveFolder, isReviewDeck, isLibraryDeck,
  })}:tones`;

  const { cards: loadedCards, isLoading, error: loadError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const toneCards = useMemo(() => loadedCards.filter((card) => toneTargets(card)), [loadedCards]);

  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [singKey, setSingKey] = useState(0);
  const resetAnswer = useCallback(() => setStatus('idle'), []);

  const session = useCardSession(toneCards, sessionKey, {
    onSessionReset: () => { audioService.stop(); resetAnswer(); },
    onAnswerStateReset: resetAnswer,
    requeueMissed: false,
  });
  const { currentCard, currentIndex, completed, moveTo } = session;
  const targets = useMemo(() => (currentCard ? toneTargets(currentCard) : null), [currentCard]);

  const playWord = useCallback(() => {
    if (!currentCard) return;
    setSingKey((key) => key + 1);
    void audioService.playCard(currentCard, pronunciationRate);
  }, [currentCard, pronunciationRate]);

  // Only on a new word, not when the rate changes.
  const playWordRef = useRef(playWord);
  playWordRef.current = playWord;
  useEffect(() => {
    if (autoPlayAudio && currentCard && !completed) playWordRef.current();
  }, [autoPlayAudio, currentCard, currentIndex, completed]);

  useEffect(() => () => audioService.stop(), []);

  /** After each drawn tone: that character's own recording, when its sound is the one written. */
  const playSyllable = useCallback((target: ToneTarget, attempt: ToneAttempt) => {
    if (!attempt.ok || target.spoken === 5 || target.spoken !== target.written) return;
    void audioService.playCard({ front: target.char, pinyin: target.syllable, source: 'dictionary' }, pronunciationRate);
  }, [pronunciationRate]);

  const advanceTimerRef = useRef<number | null>(null);
  /** Bumped on every move, so a late audio callback can't advance a word the learner already left. */
  const wordTokenRef = useRef(0);
  const clearAdvance = () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
  };
  useEffect(() => clearAdvance, []);

  const next = useCallback(() => {
    clearAdvance();
    wordTokenRef.current += 1;
    if (session.advanceOrComplete() === 'advanced') resetAnswer();
  }, [resetAnswer, session]);

  const previous = useCallback(() => {
    if (currentIndex <= 0) return;
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
    wordTokenRef.current += 1;
    moveTo(currentIndex - 1);
    resetAnswer();
  }, [currentIndex, moveTo, resetAnswer]);

  const finishWord = useCallback((attempts: ToneAttempt[]) => {
    if (!currentCard) return;
    const ok = attempts.every((attempt) => attempt.ok);
    setStatus(ok ? 'correct' : 'wrong');
    setResults((current) => (currentCard.id in current ? current : { ...current, [currentCard.id]: ok }));
    // Move on once the word has been heard again (the "auto-advance" practice settings).
    const done = audioService.playCard(currentCard, pronunciationRate);
    if (ok ? autoAdvanceCorrect : autoAdvanceWrong) {
      const token = wordTokenRef.current;
      void done.then(() => {
        if (token !== wordTokenRef.current) return;
        clearAdvance();
        advanceTimerRef.current = window.setTimeout(next, ok ? 500 : 1800);
      });
    }
  }, [autoAdvanceCorrect, autoAdvanceWrong, currentCard, next, pronunciationRate]);

  const restartRound = useCallback(() => {
    clearAdvance();
    wordTokenRef.current += 1;
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
    targets,
    status,
    completed,
    accuracy,
    singKey,
    playWord,
    playSyllable,
    finishWord,
    next,
    previous,
    restartRound,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle,
    progressInfo: session.progressInfo,
  };
}
