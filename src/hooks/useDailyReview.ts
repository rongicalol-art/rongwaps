import { useEffect, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import { fetchAllVocabularyPacks } from '../services/contentPacks';
import { prepareVocabulary } from '../services/vocabularyService';
import { useAppStore } from '../store/useAppStore';
import { isExtraDailyReview } from '../utils/srs/reviewSession';

/** Whether a review deck's answers count toward today's daily review (not the extra "Review more" pass). */
export function useCountsAsDailyReview(isReviewDeck: boolean): boolean {
  const plan = useAppStore((state) => state.dailyReviewPlan);
  const pinned = useAppStore((state) => state.activeReviewSessionCards);
  return isReviewDeck && !isExtraDailyReview(plan, pinned);
}

/** Today's review is done once its session ends with nothing left to fix (flashcards and quiz alike). */
export function useCompleteDailyReview(isReviewDeck: boolean, sessionDone: boolean) {
  const plan = useAppStore((state) => state.dailyReviewPlan);
  useEffect(() => {
    if (!isReviewDeck || !sessionDone || !plan || plan.completed) return;
    useAppStore.getState().setDailyReviewPlan({ ...plan, completed: true });
  }, [isReviewDeck, plan, sessionDone]);
}

const DISTRACTOR_LIMIT = 60;
const NONE: Flashcard[] = [];

/**
 * Wrong-answer options for a review quiz. Today's due words can be as few as one or two, too few to build
 * choices from, so other words the learner has studied (then words from the same lessons) join as options.
 * They are never asked themselves. Null while they load: the quiz plans its questions once, so it waits for them.
 */
export function useReviewDistractors(enabled: boolean, cards: readonly Flashcard[]): Flashcard[] | null {
  const idsKey = enabled ? cards.map((card) => card.id).join(',') : '';
  const [extra, setExtra] = useState<{ key: string; cards: Flashcard[] } | null>(null);
  useEffect(() => {
    if (!idsKey) return;
    let live = true;
    void fetchAllVocabularyPacks().then((rows) => {
      if (!live || !rows) return;
      const asked = new Set(idsKey.split(','));
      const learned = new Set(useAppStore.getState().learnedCards);
      const lessons = new Set([...asked].map((id) => id.match(/^B\d+L\d+/)?.[0]).filter(Boolean));
      const rank = (id: string) => (learned.has(id) ? 0 : lessons.has(id.match(/^B\d+L\d+/)?.[0]) ? 1 : 2);
      const picked = rows.map((row) => String(row.id))
        .filter((id) => !asked.has(id) && rank(id) < 2)
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, DISTRACTOR_LIMIT);
      const keep = new Set(picked);
      setExtra({ key: idsKey, cards: prepareVocabulary(rows.filter((row) => keep.has(String(row.id)))) });
    }).catch(() => { if (live) setExtra({ key: idsKey, cards: [] }); });
    return () => { live = false; };
  }, [idsKey]);
  if (!idsKey) return NONE;
  return extra?.key === idsKey ? extra.cards : null;
}
