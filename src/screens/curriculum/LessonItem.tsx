import { memo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import type { CourseLessonProgress } from '../../types/models';
import { LESSON_LANDSCAPE_ART } from '../../data/lessonLandscapeArt';
import { getEnglishLessonTitle } from '../../utils/lesson/lessonTitle';

const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP_PX = 8;

interface LessonItemProps {
  lesson: CourseLessonProgress;
  onOpen: (id: number, event?: React.MouseEvent) => void;
  /** Artwork override (the Introduction has its own); defaults to the lesson's landscape. */
  art?: string;
  /** `art` is a lesson picture: fill the tile with rounded corners instead of insetting an icon. */
  isPhoto?: boolean;
  /** Long press: start picking lessons with this one selected. Omit to disable selecting. */
  onLongPress?: (id: number) => void;
  /** While picking, a tap toggles the lesson instead of opening it. */
  isSelecting?: boolean;
  isSelected?: boolean;
  isPrevSelected?: boolean;
  isNextSelected?: boolean;
  onToggle?: (id: number, event?: React.MouseEvent) => void;
  /** Who's studying this lesson now (study together); sits at the tile's right edge. */
  faces?: ReactNode;
}

/** Selected neighbours fuse into one block: only the outer corners and the last row's edge stay. */
function containerShape(isSelected: boolean, isPrev: boolean, isNext: boolean) {
  if (!isSelected) return 'mb-3 rounded-control border-b-[length:var(--depth-lg)]';
  if (!isPrev && !isNext) return 'mb-3 rounded-control border-b-[length:var(--depth-lg)]';
  if (!isPrev) return 'mb-0 rounded-t-control border-b-0';
  if (isNext) return 'mb-0 border-y-0';
  return 'mb-3 rounded-b-control border-t-0 border-b-[length:var(--depth-lg)]';
}

function LessonItemBase({
  lesson,
  onOpen,
  art,
  isPhoto = false,
  onLongPress,
  isSelecting = false,
  isSelected = false,
  isPrevSelected = false,
  isNextSelected = false,
  onToggle,
  faces,
}: LessonItemProps) {
  const isLocked = lesson.state === 'locked';
  const englishTitle = getEnglishLessonTitle(lesson.title);

  const [shake, setShake] = useState(0);
  const pressTimer = useRef<number | null>(null);
  const safetyTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const cancelPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const clearSafetyTimer = () => {
    if (safetyTimer.current !== null) window.clearTimeout(safetyTimer.current);
    safetyTimer.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    longPressed.current = false;
    clearSafetyTimer();
    if (isLocked || isSelecting || !onLongPress) return;
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      pressTimer.current = null;
      navigator.vibrate?.(12);
      onLongPress(lesson.id);
      safetyTimer.current = window.setTimeout(() => {
        longPressed.current = false;
        safetyTimer.current = null;
      }, 800);
    }, LONG_PRESS_MS);
  };
  const handlePointerMove = (event: React.PointerEvent) => {
    const origin = pressOrigin.current;
    if (!origin || pressTimer.current === null) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_SLOP_PX) cancelPress();
  };
  const handleClick = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      event.preventDefault();
    }
    // The release that ends a long press must not also open the lesson.
    if (isLocked) {
      navigator.vibrate?.(8);
      setShake((n) => n + 1);
      return;
    }
    if (longPressed.current) {
      longPressed.current = false;
      clearSafetyTimer();
      return;
    }
    if (isSelecting && onToggle) onToggle(lesson.id, event);
    else onOpen(lesson.id, event);
  };

  return (
    <motion.div
      layout={Boolean(onLongPress)}
      key={shake}
      whileTap={isLocked ? undefined : { scale: 0.98 }}
      animate={shake ? { x: [0, -5, 5, -3, 0] } : undefined}
      transition={{
        layout: { type: 'spring', stiffness: 430, damping: 34 },
        scale: { type: 'spring', stiffness: 500, damping: 28 },
      }}
      className={cn(
        'relative min-w-0 overflow-hidden border-2 bg-ui-surface transition-colors duration-200',
        containerShape(isSelected, isPrevSelected, isNextSelected),
        isLocked && 'border-b-2',
        isSelected ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border',
      )}
    >
      {isSelected && isNextSelected && (
        <span aria-hidden className="absolute bottom-0 left-6 right-16 h-0.5 bg-brand-primary-edge" />
      )}
      <button
        type="button"
        aria-disabled={isLocked || undefined}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(event) => onLongPress && event.preventDefault()}
        aria-pressed={isSelecting ? isSelected : undefined}
        aria-label={`${englishTitle === lesson.label ? englishTitle : `${lesson.label}: ${englishTitle}`}${isLocked ? ' (locked)' : ''}`}
        style={{ WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
        className="group flex w-full min-w-0 select-none items-center gap-3.5 p-3.5 text-left outline-none transition-colors hover:bg-ui-hover focus-ring aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent"
      >
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-compact bg-ui-surface">
          <img
            src={art ?? LESSON_LANDSCAPE_ART[lesson.id]}
            alt=""
            draggable={false}
            className={cn(
              'h-full w-full transition-[filter,opacity] duration-200 ease-out motion-reduce:transition-none',
              isPhoto ? 'rounded-compact object-cover' : 'object-contain p-1',
              isLocked
                ? 'opacity-35 [filter:var(--art-rest)]'
                : isSelected
                  ? 'opacity-100'
                  : 'opacity-60 [filter:var(--art-rest)] group-hover:opacity-100 group-hover:[filter:none]',
            )}
          />
        </span>

        <span className="min-w-0 flex-1">
          {!(isLocked && englishTitle === lesson.label) && (
            <span className="block whitespace-nowrap text-xs font-extrabold uppercase tracking-widest text-ui-muted">
              {lesson.label}
            </span>
          )}
          <span className={cn(
            'block text-lg font-black leading-tight',
            isLocked ? 'line-clamp-3' : 'line-clamp-2',
            isSelected ? 'text-ui-ink-strong' : isLocked ? 'text-ui-muted' : 'text-ui-muted-strong',
          )}>
            {englishTitle}
          </span>
        </span>
        {!isLocked && faces}
      </button>
    </motion.div>
  );
}

export const LessonItem = memo(LessonItemBase);
