import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/useAppStore';
import { fetchAllVocabularyPacks } from '../../../services/contentPacks';
import type { DBVocabularyRow } from '../../../types/database';
import { computeStreak, countKnownCharacters, lessonProgress, topConfusionPairs } from '../../../utils/srs/profileStats';
import { computeReviewOverview } from '../../../utils/srs/reviewOverview';

export function useProfileData() {
  const state = useAppStore(useShallow((s) => ({
    activeBookId: s.activeBookId, characterPreference: s.characterPreference, learnedCards: s.learnedCards,
    srsData: s.srsData, reviewEvents: s.reviewEvents, wordConfusions: s.wordConfusions, grammarPages: s.completedPageIds.length,
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
    const forms = new Map(rows.map((row) => [row.id, row[state.characterPreference] ?? row.traditional ?? row.simplified ?? '']));
    const activeRows = rows.filter((row) => row.id.startsWith(`B${state.activeBookId}L`));
    const progress = lessonProgress(activeRows, state.learnedCards);
    const firstReview = state.reviewEvents.reduce((first, event) => event.reviewedAt <= now && event.reviewedAt > 0 ? Math.min(first, event.reviewedAt) : first, Infinity);
    return {
      ...computeStreak(state.reviewEvents, now), progress, vocabById, forms,
      known: computeReviewOverview(state.srsData, state.learnedCards, now).knownTotal,
      characters: countKnownCharacters(state.learnedCards, forms),
      reviews: state.reviewEvents.length, grammarPages: state.grammarPages,
      firstReview: Number.isFinite(firstReview) ? new Date(firstReview).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : null,
      pairs: topConfusionPairs(Object.fromEntries(Object.entries(state.wordConfusions).filter(([id]) => vocabById.has(id)).map(([id, others]) => [id, others.filter((other) => vocabById.has(other))]))),
      loading: vocabulary === null && !failed, failed,
      retry: () => { setFailed(false); setAttempt((value) => value + 1); },
    };
  }, [state, vocabulary, failed, now]);
}
