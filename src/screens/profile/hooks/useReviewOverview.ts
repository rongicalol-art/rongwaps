import { useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { computeReviewOverview, type ReviewOverview } from '../../../utils/reviewOverview';

/**
 * Live Profile overview derived purely from local SRS state. Pure and fast
 * (single pass over the SRS map), so it is safe to run on every render of
 * the Profile tab.
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
  const stableOverviewRef = useRef<ReviewOverview | null>(null);

  if (activeSrsData !== null && activeLearnedCards !== null) {
    stableOverviewRef.current = computeReviewOverview(activeSrsData, activeLearnedCards);
  } else if (!stableOverviewRef.current) {
    const store = useAppStore.getState();
    stableOverviewRef.current = computeReviewOverview(store.srsData, store.learnedCards);
  }

  return stableOverviewRef.current;
}
