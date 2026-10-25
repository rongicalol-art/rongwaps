import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardSession } from '../../../hooks/useCardSession';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { playFlowSentence, playSentence } from '../../../services/audio/sentenceAudio';
import type { Flashcard } from '../../../data/flashcards';
import type { PracticeFlowStatus } from '../../../types/models';
import type { LessonSentence } from './useLessonSentences';

/** The text shown for a sentence in the learner's script. */
export function sentenceText(sentence: LessonSentence, characterPreference: 'traditional' | 'simplified'): string {
  return characterPreference === 'simplified' && sentence.record.simplified ? sentence.record.simplified : sentence.record.traditional;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** useCardSession deals cards; a sentence travels as one keyed by its record id. */
function toCard({ record }: LessonSentence): Flashcard {
  return { id: record.id, bookId: record.bookId, lessonId: record.lessonId, partId: record.partId, front: record.traditional, pinyin: record.pinyin, back: record.english };
}

/**
 * The sentence reader's session: position, shuffle and resume come from `useCardSession`; this adds
 * the open cards, Hard marks and Next-plays-it. Nothing is graded, so nothing reaches SRS.
 */
export function useSentenceSession(sentences: LessonSentence[], sessionKey: string) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const flowBackDelayMs = useAppStore((state) => state.flowBackDelayMs);
  const flowSpeakTranslation = useAppStore((state) => state.flowSpeakTranslation);
  const flowRepeatPause = useAppStore((state) => state.flowRepeatPause);
  const cards = useMemo(() => sentences.map(toCard), [sentences]);
  const byId = useMemo(() => new Map(sentences.map((sentence) => [sentence.record.id, sentence])), [sentences]);
  /** Cards opened this round stay open, so moving on never changes the height of what's above. */
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [hardIds, setHardIds] = useState<ReadonlySet<string>>(() => new Set());
  const [flowStatus, setFlowStatus] = useState<PracticeFlowStatus>('idle');
  /** Bumped by every play and stop: a clip from an older request changes nothing. */
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

  const goTo = useCallback((index: number) => {
    if (index === currentIndex) return;
    stopAudio();
    moveTo(index);
  }, [currentIndex, moveTo, stopAudio]);

  /** Ends the round wherever the feed is (the feed's Finish, ↓ on the last card). */
  const finish = useCallback(() => {
    stopAudio();
    moveTo(deck.length - 1);
    advanceOrComplete();
  }, [advanceOrComplete, deck.length, moveTo, stopAudio]);

  /** A tap on the focused card shows or hides its pinyin and English. */
  const toggleOpen = useCallback(() => {
    if (!current) return;
    const { id } = current.record;
    setOpenIds((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, [current]);

  /** Next (↓): the next sentence comes into focus and plays; the last one finishes. */
  const next = useCallback(() => {
    const upcoming = deck[currentIndex + 1];
    if (!upcoming) { finish(); return; }
    goTo(currentIndex + 1);
    if (upcoming.record.audio) void play(upcoming);
  }, [currentIndex, deck, finish, goTo, play]);

  /** Anything the learner does takes over from Flow. */
  const flowRef = useRef(flowStatus);
  flowRef.current = flowStatus;
  const pauseFlow = useCallback(() => {
    if (flowRef.current !== 'playing') return;
    stopAudio();
    setFlowStatus('paused');
  }, [stopAudio]);

  const toggleFlow = useCallback(() => {
    if (flowRef.current === 'playing') pauseFlow();
    else setFlowStatus('playing');
  }, [pauseFlow]);

  /** Flow (header menu): open the card, play it (English and repeat pause per settings), move on; the last one finishes. */
  useEffect(() => {
    if (flowStatus !== 'playing' || !current || completed) return;
    let cancelled = false;
    void (async () => {
      setOpenIds((ids) => (ids.has(current.record.id) ? ids : new Set(ids).add(current.record.id)));
      const { audio, english } = current.record;
      const token = ++tokenRef.current;
      const isCancelled = () => cancelled || tokenRef.current !== token;
      // No book recording: leave time to read it rather than play the synthetic voice.
      if (audio) {
        await playFlowSentence(sentenceText(current, characterPreference), audio, english, characterPreference, {
          speakTranslation: flowSpeakTranslation, repeatPause: flowRepeatPause, isCancelled,
        });
      } else {
        await wait(flowBackDelayMs * 2);
      }
      if (isCancelled()) return;
      await wait(flowBackDelayMs);
      if (isCancelled()) return;
      if (advanceOrComplete() === 'completed') setFlowStatus('finished');
    })();
    return () => { cancelled = true; };
  }, [advanceOrComplete, characterPreference, completed, current, flowBackDelayMs, flowRepeatPause, flowSpeakTranslation, flowStatus]);

  const toggleHard = useCallback((id: string) => {
    setHardIds((ids) => {
      const nextIds = new Set(ids);
      if (!nextIds.delete(id)) nextIds.add(id);
      return nextIds;
    });
  }, []);

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
    goTo,
    next,
    finish,
    toggleOpen,
    toggleHard,
    stopAudio,
    flowStatus,
    toggleFlow,
    pauseFlow,
    reviewHard,
    play,
  };
}

export type SentenceSession = ReturnType<typeof useSentenceSession>;
