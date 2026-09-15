import React, { memo } from 'react';
import { ProgressMetricCard } from '../../../lib/widgets';
import type { ReviewOverview } from '../../../utils/reviewOverview';

interface LearningStatsGridProps {
  overview: ReviewOverview;
  favoriteCount: number;
  customFoldersCount?: number;
  localCardsCount: number;
  onNavigateToFavorites?: () => void;
  onCreateCustomCard?: () => void;
}

/**
 * Responsive 2x2 grid of learner statistics, retention metrics, and interactive quick actions.
 */
export const LearningStatsGrid = memo(function LearningStatsGrid({
  overview,
  favoriteCount,
  localCardsCount,
  onNavigateToFavorites,
  onCreateCustomCard,
}: LearningStatsGridProps) {
  const { solid, learning } = overview.stages;

  return (
    <section>
      <h2 className="mb-2.5 text-left text-xs font-black uppercase tracking-wider text-ui-muted-strong sm:mb-3">
        Stats
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <ProgressMetricCard
          label="Solid"
          value={solid}
          icon="trophy"
          accentClassName="text-feedback-success"
        />
        <ProgressMetricCard
          label="Learning"
          value={learning}
          icon="cards"
          accentClassName="text-brand-primary"
        />
        <ProgressMetricCard
          label="Favorites"
          value={favoriteCount}
          icon="bookmarkFilled"
          accentClassName="text-feedback-warning-edge"
          interactive={Boolean(onNavigateToFavorites)}
          onClick={onNavigateToFavorites}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToFavorites?.();
            }
          }}
        />
        <ProgressMetricCard
          label="Custom Cards"
          value={localCardsCount}
          icon="folder"
          accentClassName="text-brand-secondary-edge"
          interactive={Boolean(onCreateCustomCard)}
          onClick={onCreateCustomCard}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCreateCustomCard?.();
            }
          }}
        />
      </div>
    </section>
  );
});

