import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardSession } from '../../../hooks/useCardSession';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { playSentence } from '../../../services/audio/sentenceAudio';
import type { Flashcard } from '../../../data/flashcards';
import type { PracticeFlowStatus } from '../../../types/models';
import type { LessonSentence } from './useLessonSentences';

/** Flow's repeat-after-me gap: as long as the clip, at least this long. */
const MIN_SHADOW_MS = 1200;

/** The text shown for a sentence in the learner's script. */
export function sentenceText(sentence: LessonSentence, characterPreference: 'traditional' | 'simplified'): string {
  return characterPreference === 'simplified' && sentence.record.simplified ? sentence.record.simplified : sentence.record.traditional;
}

/** useCardSession deals cards; a sentence travels as one keyed by its record id. */
function toCard({ record }: LessonSentence): Flashcard {
  return { id: record.id, bookId: record.bookId, lessonId: record.lessonId, partId: record.partId, front: record.traditional, pinyin: record.pinyin, back: record.english };
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The sentence reader's session: position, shuffle and resume come from `useCardSession`; this adds
 * the open card, Hard marks and Flow. Nothing is graded, so nothing reaches SRS.
 */
export function useSentenceSession(sentences: LessonSentence[], sessionKey: string) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const cards = useMemo(() => sentences.map(toCard), [sentences]);
  const byId = useMemo(() => new Map(sentences.map((sentence) => [sentence.record.id, sentence])), [sentences]);
  /** Cards opened this round stay open, so moving on never changes the height of what's above. */
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [hardIds, setHardIds] = useState<ReadonlySet<string>>(() => new Set());
  const [flowStatus, setFlowStatus] = useState<PracticeFlowStatus>('idle');
  /** Bumped by every play, stop and Flow change: a clip or wait from an older request changes nothing. */
  const tokenRef = useRef(0);

  const stopAudio = useCallback(() => {
    tokenRef.current += 1;
    audioService.stop();
  }, []);
  const resetCard = useCallback(() => {
    stopAudio();
    setOpenIds(new Set());
    setFlowStatus('idle');
  }, [stopAudio]);

  const session = useCardSession(cards, sessionKey, { onSessionReset: resetCard, onAnswerStateReset: resetCard, requeueMissed: false });
  const { advanceOrComplete, moveTo, practiceCards, currentIndex, completed } = session;
  const deck = useMemo(
    () => session.activeCards.flatMap((card) => byId.get(card.id) ?? []),
    [byId, session.activeCards],
  );
  const current = deck[currentIndex];

  const play = useCallback((sentence: LessonSentence) => {
    const token = ++tokenRef.current;
    return playSentence(sentenceText(sentence, characterPreference), sentence.record.audio, characterPreference)
      .catch(() => {})
      .then(() => tokenRef.current === token);
  }, [characterPreference]);

  /** Any move or tap by the learner takes over from Flow. */
  const flowRef = useRef(flowStatus);
  flowRef.current = flowStatus;
  const pauseFlow = useCallback(() => {
    if (flowRef.current !== 'playing') return;
    stopAudio();
    setFlowStatus('paused');
  }, [stopAudio]);

  const goTo = useCallback((index: number) => {
    if (index === currentIndex) return;
    stopAudio();
    moveTo(index);
  }, [currentIndex, moveTo, stopAudio]);

  /** The Finish button and ↓ on the last card end the round wherever the feed is. */
  const finish = useCallback(() => {
    stopAudio();
    moveTo(deck.length - 1);
    advanceOrComplete();
  }, [advanceOrComplete, deck.length, moveTo, stopAudio]);

  /** Opening a card plays its recording; closing stops it. */
  const toggleOpen = useCallback(() => {
    if (!current) return;
    const { id } = current.record;
    if (openIds.has(id)) {
      stopAudio();
      setOpenIds((ids) => { const next = new Set(ids); next.delete(id); return next; });
      return;
    }
    setOpenIds((ids) => new Set(ids).add(id));
    if (current.record.audio) void play(current);
  }, [current, openIds, play, stopAudio]);

  /** The dock's main button and Space: Show (open and play) → Next → Finish on the last card. */
  const primaryAction = useCallback(() => {
    if (!current) return;
    if (!openIds.has(current.record.id)) toggleOpen();
    else if (currentIndex < deck.length - 1) goTo(currentIndex + 1);
    else finish();
  }, [current, currentIndex, deck.length, finish, goTo, openIds, toggleOpen]);

  const toggleHard = useCallback((id: string) => {
    setHardIds((ids) => {
      const nextIds = new Set(ids);
      if (!nextIds.delete(id)) nextIds.add(id);
      return nextIds;
    });
  }, []);

  /** Flow: open, play, leave room to repeat it, move on; the last card finishes the round. */
  useEffect(() => {
    if (flowStatus !== 'playing' || !current || completed) return;
    let cancelled = false;
    void (async () => {
      setOpenIds((ids) => (ids.has(current.record.id) ? ids : new Set(ids).add(current.record.id)));
      const { audio } = current.record;
      if (audio) {
        if (!(await play(current)) || cancelled) return;
        const clipMs = audio.start !== undefined && audio.end !== undefined ? (audio.end - audio.start) * 1000 : 0;
        await wait(Math.max(MIN_SHADOW_MS, clipMs));
      } else {
        await wait(MIN_SHADOW_MS * 2);
      }
      if (cancelled) return;
      if (advanceOrComplete() === 'completed') setFlowStatus('finished');
    })();
    return () => { cancelled = true; };
  }, [advanceOrComplete, completed, current, flowStatus, play]);

  const toggleFlow = useCallback(() => {
    if (flowStatus === 'playing') pauseFlow();
    else setFlowStatus('playing');
  }, [flowStatus, pauseFlow]);

  useEffect(() => () => { tokenRef.current += 1; audioService.stop(); }, []);

  const hardInRound = deck.filter((sentence) => hardIds.has(sentence.record.id));
  const reviewHard = useCallback(() => {
    practiceCards(hardInRound.map(toCard));
  }, [hardInRound, practiceCards]);

  return {
    deck,
    current,
    currentIndex,
    completed,
    progressInfo: session.progressInfo,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle,
    resetAll: session.resetAll,
    openIds,
    hardIds,
    hardCount: hardInRound.length,
    flowStatus,
    goTo,
    finish,
    toggleOpen,
    primaryAction,
    toggleHard,
    toggleFlow,
    pauseFlow,
    reviewHard,
    play,
  };
}

export type SentenceSession = ReturnType<typeof useSentenceSession>;
