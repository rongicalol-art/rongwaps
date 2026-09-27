import { Fragment, useId } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import type { CourseLessonPartProgress, PartSegment } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { INTERACTION_SPRING, PROGRESS_SPRING, segmentFill } from './partProgressSprings';
import { StudyPartButton } from './StudyPartButton';

export interface StudyPartProgressRailProps {
  parts: CourseLessonPartProgress[];
  onSelectPart: (partId: number) => void;
  onTogglePart: (partId: number) => void;
  segments: PartSegment[];
  currentIndex: number;
  totalCount: number;
  isRetry?: boolean;
  disabled?: boolean;
  density?: 'default' | 'compact';
  className?: string;
}

export function StudyPartProgressRail({
  parts,
  onSelectPart,
  onTogglePart,
  segments,
  currentIndex,
  totalCount,
  isRetry = false,
  disabled = false,
  className,
}: StudyPartProgressRailProps) {
  const railLayoutId = useId();
  const reduceMotion = useReducedMotion() === true;
  if (parts.length === 0) return null;

  const segmentsByPartId = new Map(segments.map((segment) => [segment.partId, segment]));

  const partsWithCounts = parts.map((part) => {
    const segment = segmentsByPartId.get(part.id);
    const cardCount = segment?.cardCount ?? (part.wordCount > 0 ? part.wordCount : 10);
    const startIndex = segment?.startIndex ?? 0;
    return { part, segment, cardCount, startIndex };
  });

  const totalAllCards = partsWithCounts.reduce((acc, p) => acc + p.cardCount, 0);
  const lastSelectedIndex = partsWithCounts.reduce(
    (latest, entry, index) => (entry.part.isSelected ? index : latest),
    0,
  );
  const interactionTransition = reduceMotion ? { duration: 0 } : INTERACTION_SPRING;
  const progressTransition = reduceMotion ? { duration: 0 } : PROGRESS_SPRING;

  return (
    <LayoutGroup id={railLayoutId}>
      <motion.div
        layout
        transition={interactionTransition}
        className={cn('relative flex w-full items-center gap-2 sm:gap-2.5', className)}
        role="group"
        aria-label="Choose study parts"
      >
        {partsWithCounts.map(({ part, segment, cardCount, startIndex }, partIndex) => {
          const flexWeight = totalAllCards > 0 ? Math.max(cardCount, 3) : 1;
          const isSelected = part.isSelected;

          const progressPercent =
            isSelected && segment ? segmentFill(currentIndex, startIndex, cardCount) : 0;

          return (
            <Fragment key={part.id}>
              <StudyPartButton
                partId={part.id}
                cardCount={cardCount}
                progressPercent={progressPercent}
                flexWeight={flexWeight}
                isSelected={isSelected}
                disabled={disabled}
                reduceMotion={reduceMotion}
                interactionTransition={interactionTransition}
                progressTransition={progressTransition}
                onSelectPart={onSelectPart}
                onTogglePart={onTogglePart}
              />

              {partIndex === lastSelectedIndex && totalCount > 0 && (
                <motion.span
                  layout
                  layoutId="study-progress-count"
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={interactionTransition}
                  aria-live="polite"
                  className={cn(
                    "hidden min-w-14 shrink-0 whitespace-nowrap text-center text-sm font-extrabold sm:inline-flex sm:justify-center",
                    isRetry ? "text-feedback-warning-edge tracking-wider" : "tabular-nums text-ui-muted"
                  )}
                >
                  {isRetry ? 'Again' : `${Math.min(currentIndex + 1, totalCount)} / ${totalCount}`}
                </motion.span>
              )}
            </Fragment>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
