import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { computeReviewOverview, type ReviewOverview } from '../../../utils/reviewOverview';

/**
 * Live Profile overview derived purely from local SRS state. Pure and fast
 * (single pass over the SRS map), so it is safe to run on every render of
 * the Profile tab.
 */
export function useReviewOverview(): ReviewOverview {
  const srsData = useAppStore((state) => state.srsData);
  const learnedCards = useAppStore((state) => state.learnedCards);

  return useMemo(
    () => computeReviewOverview(srsData, learnedCards),
    [srsData, learnedCards],
  );
}
