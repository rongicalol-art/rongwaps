import { memo, useCallback, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import type { CourseLessonProgress } from '../../types/models';
import { LESSON_LANDSCAPE_ART } from '../../data/lessonLandscapeArt';
import { getEnglishLessonTitle } from '../../utils/lesson/lessonTitle';
import { AppIcon, ContextMenu, useMenuTrigger, type ContextMenuAction, type MenuPoint } from '../../lib/widgets';
import { ActivityRing } from './lesson-window/ActivityRing';

interface LessonItemProps {
  lesson: CourseLessonProgress;
  onOpen: (id: number, event?: React.MouseEvent) => void;
  /** Artwork override (the Introduction has its own); defaults to the lesson's landscape. */
  art?: string;
  /** `art` is a lesson picture: fill the tile with rounded corners instead of insetting an icon. */
  isPhoto?: boolean;
  /** Menu "Select": start picking lessons with this one selected. Omit to disable selecting. */
  onLongPress?: (id: number) => void;
  /** Menu "Mark as done" / "Mark as not done". Omit to leave it out of the menu. */
  onMarkDone?: (id: number, done: boolean) => void;
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

/** How far the lesson is, 0–1: each activity (words, grammar, reading) counts equally; done is full. */
function lessonFraction(lesson: CourseLessonProgress) {
  if (lesson.isFullyCompleted) return 1;
  const bars = lesson.activityBars;
  return bars.length ? bars.reduce((sum, bar) => sum + bar.fraction, 0) / bars.length : 0;
}

function LessonItemBase({
  lesson,
  onOpen,
  art,
  isPhoto = false,
  onLongPress,
  onMarkDone,
  isSelecting = false,
  isSelected = false,
  isPrevSelected = false,
  isNextSelected = false,
  onToggle,
  faces,
}: LessonItemProps) {
  const isLocked = lesson.state === 'locked';
  const isDone = lesson.isFullyCompleted;
  const englishTitle = getEnglishLessonTitle(lesson.title);
  // The same ring as the lesson screen: shown once the lesson is started, a check once it is done.
  const fraction = lessonFraction(lesson);
  const showRing = !isLocked && fraction > 0;

  const [shake, setShake] = useState(0);
  const [menuPoint, setMenuPoint] = useState<MenuPoint | null>(null);
  const closeMenu = useCallback(() => setMenuPoint(null), []);
  const actions: ContextMenuAction[] = [
    ...(onMarkDone && !isDone ? [{ id: 'done', label: 'Mark as done', icon: 'check' as const, onSelect: () => onMarkDone(lesson.id, true) }] : []),
    ...(onMarkDone && lesson.isMarkedDone ? [{ id: 'undone', label: 'Mark as not done', icon: 'restart' as const, onSelect: () => onMarkDone(lesson.id, false) }] : []),
    ...(onLongPress ? [{ id: 'select', label: 'Select', icon: 'choices' as const, onSelect: () => onLongPress(lesson.id) }] : []),
  ];
  // Right-click or a long press opens the menu (not while picking lessons, never on a locked lesson).
  const menuTrigger = useMenuTrigger((point) => {
    navigator.vibrate?.(12);
    setMenuPoint(point);
  }, isLocked || isSelecting || actions.length === 0);

  const handleClick = (event: React.MouseEvent) => {
    if (event.shiftKey) event.preventDefault();
    if (isLocked) {
      navigator.vibrate?.(8);
      setShake((n) => n + 1);
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
        {...menuTrigger}
        aria-pressed={isSelecting ? isSelected : undefined}
        aria-haspopup={actions.length > 0 && !isLocked ? 'menu' : undefined}
        aria-label={`${englishTitle === lesson.label ? englishTitle : `${lesson.label}: ${englishTitle}`}${isLocked ? ' (locked)' : isDone ? ' (done)' : ''}`}
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
            isSelected || isDone ? 'text-ui-ink-strong' : isLocked ? 'text-ui-muted' : 'text-ui-muted-strong',
          )}>
            {englishTitle}
          </span>
        </span>
        {!isLocked && lesson.isTestPassed && (
          <AppIcon name="crown" size={20} className="shrink-0 text-feedback-warning" aria-label="Test passed" />
        )}
        {showRing && <ActivityRing fraction={fraction} label={lesson.label} />}
        {!isLocked && faces}
      </button>
      {menuPoint && (
        <ContextMenu point={menuPoint} label={`${lesson.label} options`} actions={actions} onClose={closeMenu} />
      )}
    </motion.div>
  );
}

export const LessonItem = memo(LessonItemBase);
