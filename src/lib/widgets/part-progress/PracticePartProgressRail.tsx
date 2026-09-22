import { motion } from 'motion/react';
import type { PartSegment } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { visibleProgressWidth } from '../../../utils/progress';
import { PROGRESS_SPRING, segmentFill } from './partProgressSprings';

export interface PracticePartProgressRailProps {
  segments: PartSegment[];
  currentIndex: number;
  totalCount: number;
  density?: 'default' | 'compact';
  className?: string;
  ariaLabel?: string;
  unitLabel?: string;
}

export function PracticePartProgressRail({
  segments,
  currentIndex,
  totalCount,
  className,
  ariaLabel = 'Practice progress by part',
  unitLabel = 'cards',
}: PracticePartProgressRailProps) {
  if (segments.length <= 1 || totalCount <= 0) return null;

  const totalAllCards = segments.reduce((acc, s) => acc + s.cardCount, 0);

  return (
    <div className={cn('flex w-full gap-2 sm:gap-2.5', className)} aria-label={ariaLabel}>
      {segments.map((segment) => {
        const flexWeight = totalAllCards > 0 ? segment.cardCount : 1;
        const progressPercent = segmentFill(currentIndex, segment.startIndex, segment.cardCount);

        return (
          <div
            key={`${segment.partId}-${segment.startIndex}`}
            style={{ flex: flexWeight }}
            className="relative h-5 w-full min-w-0 overflow-hidden rounded-full bg-brand-primary-track"
            title={`${segment.label}: ${segment.cardCount} ${unitLabel}`}
          >
            <motion.div
              className="relative h-full min-w-0 overflow-hidden rounded-full bg-brand-primary will-change-[width]"
              initial={false}
              animate={{ width: visibleProgressWidth(progressPercent) }}
              transition={PROGRESS_SPRING}
            >
              {progressPercent > 0 && (
                <span className="pointer-events-none absolute left-2 right-2 top-1 h-1.5 rounded-full bg-white/30" />
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
