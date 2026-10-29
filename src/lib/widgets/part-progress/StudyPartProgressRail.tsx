import { Fragment } from 'react';
import type { CourseLessonPartProgress, PartSegment } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { segmentFill } from './partProgressSprings';
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

  return (
    <div
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
              onSelectPart={onSelectPart}
              onTogglePart={onTogglePart}
            />

            {partIndex === lastSelectedIndex && totalCount > 0 && (
              <span
                aria-live="polite"
                className={cn(
                  "hidden min-w-14 shrink-0 whitespace-nowrap text-center text-base font-black sm:inline-flex sm:justify-center",
                  isRetry ? "text-feedback-warning-text tracking-wider" : "tabular-nums text-ui-muted-strong"
                )}
              >
                {isRetry ? 'Again' : `${Math.min(currentIndex + 1, totalCount)} / ${totalCount}`}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
