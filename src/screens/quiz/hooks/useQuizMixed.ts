import { useQuizAnswerAudio } from './useQuizAnswerAudio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { useAppStore, type MatchPairType } from '../../../store/useAppStore';
import { useCardSession } from '../../../hooks/useCardSession';
import { useAudioSessionLifecycle } from '../../../hooks/useSessionAudio';
import { quizSnapshotKey } from '../../../utils/srs/resumeState';
import { planQuizRound, parseMeasureWord, wordsForQuizTypes, type QuizBeat, type QuizTypeId } from '../../../utils/vocabulary/quizDirector';

type BeatStatus = 'idle' | 'correct' | 'wrong';
export type FollowUpState = 'closed' | 'open' | 'done';

interface RoundSnapshot {
  nonce: string;
}


/** The round's seed, frozen at its start so a reload resumes the same plan. */
function readSnapshot(sessionKey: string): RoundSnapshot {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(quizSnapshotKey(sessionKey)) ?? 'null') as RoundSnapshot | null;
    if (saved?.nonce) return saved;
  } catch { /* storage unavailable: the plan just isn't resumable */ }
  const fresh: RoundSnapshot = { nonce: Math.random().toString(36).slice(2, 10) };
  try { window.sessionStorage.setItem(quizSnapshotKey(sessionKey), JSON.stringify(fresh)); } catch { /* ignore */ }
  return fresh;
}

function clearSnapshot(sessionKey: string) {
  try { window.sessionStorage.removeItem(quizSnapshotKey(sessionKey)); } catch { /* ignore */ }
}

/**
 * Mixed vocab quiz: the director plans one beat per question (a beat may cover 3-5 words).
 * `useCardSession` still counts words, so a beat's words advance together.
 */
export function useQuizMixed(cards: Flashcard[], sessionKey: string, types?: readonly QuizTypeId[]) {
  const matchPairType = useAppStore((state) => state.matchPairType);

  const [status, setStatus] = useState<BeatStatus>('idle');
  const { answerAudioPlaying, playWord, stopAnswerAudio } = useQuizAnswerAudio();
  const [missedLabel, setMissedLabel] = useState('');
  const [followUp, setFollowUp] = useState<FollowUpState>('closed');
  const [inBeatDone, setInBeatDone] = useState(0);
  const [pass, setPass] = useState(0);
  const measureUsed = useRef(false);
  const matchRef = useRef<{ done: Set<string>; missed: Flashcard[] }>({ done: new Set(), missed: [] });
  const snapshotRef = useRef<{ key: string; value: RoundSnapshot } | null>(null);
  /** The Match Pairs setting is read when a round's plan is built, so toggling it mid-round never re-plans the beats under the learner. */
  const planConfigRef = useRef<{ key: string; matchPairType: MatchPairType } | null>(null);

  const resetBeat = useCallback(() => {
    stopAnswerAudio();
    setStatus('idle');
    setMissedLabel('');
    setFollowUp('closed');
    setInBeatDone(0);
    matchRef.current = { done: new Set(), missed: [] };
  }, [stopAnswerAudio]);

  const typesKey = types?.join(',') ?? '';
  // Picked types keep only the words that fit them (a one-character word has no Build the word).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- types is keyed by typesKey
  const quizCards = useMemo(() => wordsForQuizTypes(cards, types ?? []), [cards, typesKey]);
  const session = useCardSession(quizCards, sessionKey, {
    requeueMissed: false,
    onSessionReset: () => {
      resetBeat();
      setPass(0);
      measureUsed.current = false;
      snapshotRef.current = null;
    },
    onAnswerStateReset: resetBeat,
  });
  const { activeCards, currentIndex, completed } = session;

  useAudioSessionLifecycle(completed);

  const isReviewPass = pass > 0 || session.resumedReview;
  const idsKey = activeCards.map((card) => card.id).join(',');
  const beats = useMemo<QuizBeat[]>(() => {
    if (activeCards.length === 0) return [];
    if (snapshotRef.current?.key !== sessionKey) snapshotRef.current = { key: sessionKey, value: readSnapshot(sessionKey) };
    const { nonce } = snapshotRef.current.value;
    const planKey = `${sessionKey}|${idsKey}|${pass}`;
    if (planConfigRef.current?.key !== planKey) planConfigRef.current = { key: planKey, matchPairType };
    return planQuizRound(activeCards, {
      seed: `${sessionKey}|${nonce}|${pass}`,
      reviewPass: isReviewPass,
      extraCards: cards,
      confusions: useAppStore.getState().wordConfusions,
      types,
      matchPairType: planConfigRef.current.matchPairType,
    });
    // activeCards is keyed by its ids. matchPairType is frozen per round on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, sessionKey, pass, isReviewPass, typesKey]);

  const starts = useMemo(() => {
    let at = 0;
    return beats.map((beat) => {
      const start = at;
      at += beat.cards.length;
      return start;
    });
  }, [beats]);
  const beatIndex = Math.max(0, starts.findIndex((start, i) => currentIndex >= start && currentIndex < start + beats[i].cards.length));
  const beat: QuizBeat | undefined = beats[beatIndex];
  const audioBeats = useMemo(() => beats.slice(beatIndex, beatIndex + 2), [beats, beatIndex]);
  // Typed like useCardSession's card (undefined only before the deck loads; the shell renders nothing then).
  const currentCard = beat?.cards[0] as Flashcard;
  const beatEnd = beat ? starts[beatIndex] + beat.cards.length : 0;

  /** One question, one word: records once and shows the feedback bar. A wrong pick is remembered as a mix-up. */
  const resolveSingle = useCallback((correct: boolean, confusedWithId?: string) => {
    if (!beat || beat.cards.length !== 1 || !session.beginGrading()) return;
    const card = beat.cards[0];
    setStatus(correct ? 'correct' : 'wrong');
    if (!correct && confusedWithId) useAppStore.getState().recordConfusion(card.id, confusedWithId);
    playWord(card);
    session.recordAnswer(card, correct ? 4 : 2);
    if (correct && beat.format === 'pick-meaning' && !isReviewPass && !measureUsed.current && parseMeasureWord(card.back)) {
      measureUsed.current = true;
      setFollowUp('open');
    }
  }, [beat, isReviewPass, playWord, session]);

  /** A match pair resolved: the word is recorded now, the beat ends when every pair is matched. */
  const resolvePair = useCallback((card: Flashcard, firstTry: boolean) => {
    if (!beat) return;
    const match = matchRef.current;
    if (match.done.has(card.id)) return;
    match.done.add(card.id);
    // Each matched pair moves the bar; Continue's advance lands on the same count.
    setInBeatDone(match.done.size);
    // PairMatch plays the word when its left tile is selected. Replaying it here
    // interrupts the clip that is already playing when the right tile matches.
    if (!firstTry) match.missed.push(card);
    session.recordAnswer(card, firstTry ? 4 : 2);
    if (match.done.size < beat.cards.length) return;
    setMissedLabel(match.missed.map((c) => `${c.front} ${c.back}`).join('  ·  '));
    setStatus(match.missed.length === 0 ? 'correct' : 'wrong');
  }, [beat, session]);

  /** A wrong match pair: the two words were mixed up. */
  const resolveMismatch = useCallback((cardId: string, otherId: string) => {
    useAppStore.getState().recordConfusion(cardId, otherId);
  }, []);

  const handleCheck = useCallback(() => {
    if (status === 'idle' || !beat) return;
    const steps = Math.max(1, beatEnd - session.currentIndex);
    resetBeat();
    session.clearGrading();
    for (let i = 0; i < steps; i += 1) session.advanceOrComplete();
  }, [beat, beatEnd, resetBeat, session, status]);

  const resetAll = useCallback(() => {
    clearSnapshot(sessionKey);
    snapshotRef.current = null;
    measureUsed.current = false;
    setPass(0);
    session.resetAll();
  }, [session, sessionKey]);

  const reviewUnlearned = useCallback(() => {
    setPass((value) => value + 1);
    session.reviewUnlearned();
  }, [session]);

  const toggleShuffle = session.toggleShuffle;
  const finished = completed && session.unlearnedCount === 0;
  useEffect(() => {
    if (finished) clearSnapshot(sessionKey);
  }, [finished, sessionKey]);

  return {
    activeCards,
    currentIndex,
    inBeatDone,
    currentCard,
    beat,
    audioBeats,
    audioPreparationKey: `${sessionKey}|${pass}`,
    beatKey: beat ? `${beatIndex}:${pass}` : '',
    isReviewPass,
    status,
    answerAudioPlaying,
    missedLabel,
    followUp,
    closeFollowUp: useCallback(() => setFollowUp('done'), []),
    resolveSingle,
    resolvePair,
    resolveMismatch,
    handleCheck,
    completed,
    resumedReview: session.resumedReview,
    resetAll,
    practiceCards: session.practiceCards,
    missedCards: activeCards.filter((card) => session.sessionResults[card.id] === 1 || session.sessionResults[card.id] === 2),
    reviewUnlearned,
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle,
    resetNonce: session.resetNonce,
  };
}
