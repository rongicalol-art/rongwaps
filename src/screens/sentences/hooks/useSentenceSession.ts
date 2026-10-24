import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardSession } from '../../../hooks/useCardSession';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { playSentence } from '../../../services/audio/sentenceAudio';
import type { Flashcard } from '../../../data/flashcards';
import type { LessonSentence } from './useLessonSentences';

/** The text shown for a sentence in the learner's script. */
export function sentenceText(sentence: LessonSentence, characterPreference: 'traditional' | 'simplified'): string {
  return characterPreference === 'simplified' && sentence.record.simplified ? sentence.record.simplified : sentence.record.traditional;
}

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
  const cards = useMemo(() => sentences.map(toCard), [sentences]);
  const byId = useMemo(() => new Map(sentences.map((sentence) => [sentence.record.id, sentence])), [sentences]);
  /** Cards opened this round stay open, so moving on never changes the height of what's above. */
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [hardIds, setHardIds] = useState<ReadonlySet<string>>(() => new Set());
  /** Bumped by every play and stop: a clip from an older request changes nothing. */
  const tokenRef = useRef(0);

  const stopAudio = useCallback(() => {
    tokenRef.current += 1;
    audioService.stop();
  }, []);
  const resetCard = useCallback(() => {
    stopAudio();
    setOpenIds(new Set());
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

  /** Next on the last card ends the round wherever the feed is. */
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

  /** Next (dock, Space, ↓): the next sentence comes into focus and plays; the last one finishes. */
  const next = useCallback(() => {
    const upcoming = deck[currentIndex + 1];
    if (!upcoming) { finish(); return; }
    goTo(currentIndex + 1);
    if (upcoming.record.audio) void play(upcoming);
  }, [currentIndex, deck, finish, goTo, play]);

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
    toggleOpen,
    toggleHard,
    stopAudio,
    reviewHard,
    play,
  };
}

export type SentenceSession = ReturnType<typeof useSentenceSession>;
