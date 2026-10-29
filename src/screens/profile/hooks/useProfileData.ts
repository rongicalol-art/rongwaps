import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/useAppStore';
import { fetchAllVocabularyPacks } from '../../../services/contentPacks';
import type { DBVocabularyRow } from '../../../types/database';
import { characterForms, computeStreak, countKnownCharacters, firstReviewAt, lessonProgress } from '../../../utils/srs/profileStats';
import { computeReviewOverview } from '../../../utils/srs/reviewOverview';

export function useProfileData() {
  const state = useAppStore(useShallow((s) => ({
    activeBookId: s.activeBookId, characterPreference: s.characterPreference, learnedCards: s.learnedCards,
    srsData: s.srsData, reviewEvents: s.reviewEvents, grammarPages: s.completedPageIds.length,
  })));
  const [vocabulary, setVocabulary] = useState<DBVocabularyRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let alive = true;
    void fetchAllVocabularyPacks().then((rows) => {
      if (alive) { setVocabulary(rows); setFailed(rows === null); }
    });
    return () => { alive = false; };
  }, [attempt]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return useMemo(() => {
    const rows = vocabulary ?? [];
    const vocabById = new Map(rows.map((row) => [row.id, row]));
    const forms = characterForms(rows, state.characterPreference);
    const activeRows = rows.filter((row) => row.id.startsWith(`B${state.activeBookId}L`));
    const progress = lessonProgress(activeRows, state.learnedCards);
    const firstReview = firstReviewAt(state.reviewEvents, now);
    const recentWordIds: string[] = [];
    for (const event of [...state.reviewEvents].sort((a, b) => b.reviewedAt - a.reviewedAt)) {
      if (event.reviewedAt > now || event.reviewedAt <= 0 || recentWordIds.includes(event.cardId) || !vocabById.has(event.cardId)) continue;
      recentWordIds.push(event.cardId);
      if (recentWordIds.length === 3) break;
    }
    return {
      ...computeStreak(state.reviewEvents, now), progress, activeBookId: state.activeBookId, vocabById, forms,
      known: computeReviewOverview(state.srsData, state.learnedCards, now).knownTotal,
      characters: countKnownCharacters(state.learnedCards, forms),
      reviews: state.reviewEvents.length, grammarPages: state.grammarPages,
      firstReview: firstReview === null ? null : new Date(firstReview).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      recentWordIds,
      loading: vocabulary === null && !failed, failed,
      retry: () => { setFailed(false); setAttempt((value) => value + 1); },
    };
  }, [state, vocabulary, failed, now]);
}
