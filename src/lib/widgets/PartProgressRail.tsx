import type { ButtonHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import type { CourseLessonPartProgress, PartSegment } from '../../types/models';
import { cn } from '../../utils/cn';
import { visibleProgressWidth } from '../../utils/progress';

interface SelectablePartProgressRailProps {
  parts: CourseLessonPartProgress[];
  onTogglePart: (partId: number) => void;
  disabled?: boolean;
  className?: string;
}

interface PracticePartProgressRailProps {
  segments: PartSegment[];
  currentIndex: number;
  totalCount: number;
  density?: 'default' | 'compact';
  className?: string;
}

interface StudyPartProgressRailProps {
  parts: CourseLessonPartProgress[];
  onTogglePart: (partId: number) => void;
  segments: PartSegment[];
  currentIndex: number;
  disabled?: boolean;
  density?: 'default' | 'compact';
  className?: string;
}

function segmentFill(currentIndex: number, startIndex: number, cardCount: number) {
  if (currentIndex < startIndex) return 0;
  if (currentIndex >= startIndex + cardCount - 1) return 100;
  return ((currentIndex - startIndex + 1) / cardCount) * 100;
}

const PROGRESS_SPRING = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 32,
  mass: 0.7,
};

function PartButton({
  selected,
  progress,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  progress: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'group relative min-h-[56px] min-w-[84px] flex-1 overflow-hidden rounded-[16px] border-2 px-3 py-2 text-left transition-all duration-150 font-sans',
        selected
          ? 'border-brand-primary-edge bg-[#E8F7FF] text-ui-ink-strong shadow-[0_4px_14px_rgba(28,176,246,0.14)]'
          : 'border-ui-border bg-ui-canvas text-ui-muted hover:bg-ui-surface-hover',
        'active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 transition-all duration-500',
          selected ? 'bg-brand-primary/18' : 'bg-ui-border/40',
        )}
        style={{ width: `${progress}%` }}
      />
      <span className="relative z-10 flex h-full flex-col justify-between gap-1.5 font-sans">
        {children}
      </span>
    </button>
  );
}

export function SelectablePartProgressRail({
  parts,
  onTogglePart,
  disabled = false,
  className,
}: SelectablePartProgressRailProps) {
  if (parts.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Choose lesson parts"
      className={cn('flex flex-col gap-2 sm:flex-row font-sans', className)}
    >
      {parts.map((part) => {
        const progress = part.wordCount > 0
          ? Math.round((part.learnedCount / part.wordCount) * 100)
          : 0;

        return (
          <PartButton
            key={part.id}
            selected={part.isSelected}
            progress={progress}
            disabled={disabled}
            onClick={() => onTogglePart(part.id)}
            aria-label={`Part ${part.id}, ${part.wordCount} words, ${progress} percent through this study session${part.isSelected ? ', active' : ''}`}
          >
            <span className="flex items-center justify-between gap-2 font-sans">
              <span className="text-[13px] font-black">Part {part.id}</span>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-black font-sans',
                part.isSelected ? 'bg-brand-primary text-white' : 'bg-ui-surface text-ui-muted-strong',
              )}>
                {part.isSelected ? 'ON' : 'OFF'}
              </span>
            </span>
            <span className="flex items-end justify-between gap-2 font-sans">
              <span className="text-[10px] font-black uppercase tracking-[0.06em] text-ui-muted-strong font-sans">
                {part.wordCount} words
              </span>
              <span className="text-[15px] font-black tabular-nums text-ui-ink-strong font-sans">{progress}%</span>
            </span>
          </PartButton>
        );
      })}
    </div>
  );
}

export function PracticePartProgressRail({
  segments,
  currentIndex,
  totalCount,
  className,
}: PracticePartProgressRailProps) {
  if (segments.length <= 1 || totalCount <= 0) return null;

  const totalAllCards = segments.reduce((acc, s) => acc + s.cardCount, 0);

  return (
    <div className={cn('flex w-full gap-2 sm:gap-2.5', className)} aria-label="Practice progress by part">
      {segments.map((segment) => {
        const flexWeight = totalAllCards > 0 ? segment.cardCount : 1;
        const progressPercent = segmentFill(currentIndex, segment.startIndex, segment.cardCount);

        return (
          <div
            key={`${segment.partId}-${segment.startIndex}`}
            style={{ flex: flexWeight }}
            className="relative h-5 w-full min-w-0 overflow-hidden rounded-full bg-ui-divider"
            title={`${segment.label}: ${segment.cardCount} cards`}
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

export function StudyPartProgressRail({
  parts,
  onTogglePart,
  segments,
  currentIndex,
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

  return (
    <div
      className={cn('flex w-full gap-2 sm:gap-2.5', className)}
      role="group"
      aria-label="Choose study parts"
    >
      {partsWithCounts.map(({ part, segment, cardCount, startIndex }) => {
        const flexWeight = totalAllCards > 0 ? cardCount : 1;
        const isSelected = part.isSelected;

        const progressPercent = isSelected && segment
          ? segmentFill(currentIndex, startIndex, cardCount)
          : 0;

        return (
          <button
            key={part.id}
            type="button"
            disabled={disabled}
            onClick={() => onTogglePart(part.id)}
            aria-pressed={isSelected}
            aria-label={`Part ${part.id}, ${cardCount} cards${isSelected ? ', active' : ''}`}
            title={`Part ${part.id} · ${cardCount} cards`}
            style={{ flex: flexWeight }}
            className={cn(
              'group relative h-5 w-full min-w-0 cursor-pointer select-none overflow-hidden rounded-full border-2 border-transparent outline-none transition-[transform,background-color] duration-200 hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-brand-primary/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'bg-ui-divider'
                : 'bg-ui-hover hover:bg-ui-divider/70',
            )}
          >
            {isSelected && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-brand-primary"
                initial={false}
                animate={{ width: visibleProgressWidth(progressPercent) }}
                transition={PROGRESS_SPRING}
              >
                {progressPercent > 0 && (
                  <span className="pointer-events-none absolute left-2 right-2 top-1 h-1 rounded-full bg-white/30" />
                )}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
