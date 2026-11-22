import { reviewDay, dailyReviewGoal } from '../../../utils/srs/reviewSession';
import { useMemo, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { computeReviewOverview, isSrsDue, type ReviewOverview } from '../../../utils/srs/reviewOverview';

/**
 * Live Library overview derived purely from local SRS state. Pure and fast
 * (single pass over the SRS map), so it is safe to run on every render of
 * the Library tab.
 *
 * When an active practice activity is open, subscription to srsData and
 * learnedCards is paused to avoid background re-renders on every card swipe.
 */
export function useReviewOverview(): ReviewOverview {
  const activeSrsData = useAppStore((state) => (
    state.activeActivity ? null : state.srsData
  ));
  const activeLearnedCards = useAppStore((state) => (
    state.activeActivity ? null : state.learnedCards
  ));
  const events = useAppStore(state => state.activeActivity ? null : state.reviewEvents);
  const plan = useAppStore(state => state.activeActivity ? null : state.dailyReviewPlan);
  const stableOverviewRef = useRef<ReviewOverview | null>(null);

  // Recomputed when its inputs change or a minute passes (cards fall due), not on every render: this hook's
  // screen re-renders on each keystroke in Library search.
  const minute = Math.floor(Date.now() / 60_000);
  const fresh = useMemo(() => {
    if (activeSrsData === null || activeLearnedCards === null) return null;
    const base = computeReviewOverview(activeSrsData, activeLearnedCards);
    const today = reviewDay();
    const goal = dailyReviewGoal(events ?? []);
    const dailyAnswers = plan?.day === today ? plan.answers : goal.answers;
    const reviewedToday = new Set(Object.keys(dailyAnswers));
    const now = Date.now();
    const extraDueCount = Object.entries(activeSrsData).filter(([id, srs]) => (
      isSrsDue(srs, now) && !reviewedToday.has(id)
    )).length;
    return { ...base,
      dailyCompleted: plan?.day === today ? plan.completed : goal.completed,
      dailyCount: plan?.day === today ? plan.cardIds.filter(id => !(id in plan.answers)).length
        : Math.min(base.dueCount, Math.max(0, goal.capacity - Object.keys(goal.answers).length)),
      extraDueCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `minute` is the clock input
  }, [activeSrsData, activeLearnedCards, events, plan, minute]);
  if (fresh) {
    stableOverviewRef.current = fresh;
  } else if (!stableOverviewRef.current) {
    const store = useAppStore.getState();
    stableOverviewRef.current = computeReviewOverview(store.srsData, store.learnedCards);
  }

  return stableOverviewRef.current;
}
