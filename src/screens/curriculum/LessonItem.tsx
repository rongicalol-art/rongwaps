import { memo } from 'react';
import { motion } from 'motion/react';
import { LESSON_LANDSCAPE_ART } from '../../data/lessonLandscapeArt';
import { AppIcon } from '../../lib/widgets';
import type { CourseLessonProgress } from '../../types/models';
import { getEnglishLessonTitle } from '../../utils/lessonTitle';

interface LessonItemProps {
  lesson: CourseLessonProgress;
  isSelected: boolean;
  isPrevSelected: boolean;
  isNextSelected: boolean;
  onToggle: (id: number) => void;
  accentColor: string;
  edgeHex: string;
  /** Manifest id of the lesson's first grammar part; hides the panel when absent. */
  grammarPartId?: string;
  onOpenGrammar?: (partId: string) => void;
}

function LessonItemBase({
  lesson,
  isSelected,
  isPrevSelected,
  isNextSelected,
  onToggle,
  accentColor,
  edgeHex,
  grammarPartId,
  onOpenGrammar,
}: LessonItemProps) {
  const isLocked = lesson.state === 'locked';
  const landscapeSrc = LESSON_LANDSCAPE_ART[lesson.id];
  const englishTitle = getEnglishLessonTitle(lesson.title);
  let containerClasses = 'mb-3 rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface';
  let innerDivider = null;

  if (isSelected) {
    if (!isPrevSelected && !isNextSelected) {
      containerClasses = 'mb-3 rounded-feature border-2 border-ui-border border-b-[length:var(--depth-lg)] bg-ui-surface';
    } else if (!isPrevSelected && isNextSelected) {
      containerClasses = 'mb-0 rounded-t-feature border-2 border-ui-border border-b-0 bg-ui-surface';
      innerDivider = <div className="absolute bottom-0 left-6 right-16 h-0.5" style={{ background: `linear-gradient(to right, ${edgeHex}, transparent)` }} />;
    } else if (isPrevSelected && isNextSelected) {
      containerClasses = 'mb-0 border-x-2 border-y-0 border-ui-border bg-ui-surface';
      innerDivider = <div className="absolute bottom-0 left-6 right-16 h-0.5" style={{ background: `linear-gradient(to right, ${edgeHex}, transparent)` }} />;
    } else {
      containerClasses = 'mb-3 rounded-b-feature border-x-2 border-t-0 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface';
    }
  }

  return (
    <motion.div
      layout
      whileTap={isLocked ? undefined : { scale: 0.98 }}
      transition={{
        layout: { type: 'spring', stiffness: 430, damping: 34 },
        scale: { type: 'spring', stiffness: 500, damping: 28 },
      }}
      style={isSelected ? { borderColor: edgeHex } : undefined}
      className={`relative flex min-h-20 min-w-0 items-center overflow-hidden transition-colors duration-300 ${containerClasses}`}
    >
      {innerDivider}
      <button
        type="button"
        disabled={isLocked}
        onClick={() => onToggle(lesson.id)}
        aria-pressed={isSelected}
        aria-label={`${lesson.label}: ${englishTitle}${isLocked ? ' (locked)' : ''}`}
        className="group flex min-w-0 flex-1 items-center gap-3 self-stretch p-3 text-left sm:gap-4 sm:p-4 outline-none transition-colors hover:bg-ui-hover focus-ring disabled:cursor-not-allowed"
      >
        <span className="relative flex h-12 w-12 shrink-0 sm:h-14 sm:w-14 items-center justify-center">
          <img
            src={landscapeSrc}
            alt=""
            className={`h-full w-full object-contain transition-[filter,transform,opacity] duration-300 ${
              isLocked
                ? 'opacity-35 grayscale'
                : isSelected
                  ? 'scale-[1.03] brightness-[0.9] contrast-[1.08] saturate-[1.18]'
                  : ''
            }`}
          />
          {isLocked && (
            <span className="absolute grid h-7 w-7 place-items-center rounded-full bg-ui-surface text-ui-muted border-b-[length:var(--depth-sm)] border-ui-border">
              <AppIcon name="lock" size={16} />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`mb-0.5 block whitespace-nowrap text-xs font-extrabold uppercase tracking-wider transition-colors sm:tracking-widest ${
            isSelected ? accentColor : 'text-ui-muted'
          }`}>
            {lesson.label}
          </span>
          <span className={`block line-clamp-2 text-base font-extrabold leading-tight transition-colors sm:text-lg ${
            isSelected ? 'text-ui-ink' : 'text-ui-muted group-hover:text-ui-ink'
          }`}>
            {englishTitle}
          </span>
        </span>
      </button>

      {grammarPartId && onOpenGrammar && (
        <div className="flex self-stretch items-stretch">
          <div className="my-3 w-0.5 shrink-0 bg-ui-divider" />
          <button
            type="button"
            disabled={isLocked}
            onClick={() => onOpenGrammar(grammarPartId)}
            aria-label={`Open grammar for ${englishTitle}`}
            className={`flex w-12 shrink-0 sm:w-[3.75rem] items-center justify-center outline-none transition-[background-color,transform] duration-150 focus-ring focus-visible:ring-inset active:scale-95 disabled:active:scale-100 ${
              isLocked
                ? 'cursor-not-allowed text-ui-muted'
                : isSelected
                  ? 'text-ui-ink hover:bg-brand-primary/12 active:bg-brand-primary/20'
                  : 'text-ui-muted hover:bg-brand-primary/12 active:bg-brand-primary/20'
            }`}
          >
            <AppIcon name="grammar" size={26} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export const LessonItem = memo(LessonItemBase);
