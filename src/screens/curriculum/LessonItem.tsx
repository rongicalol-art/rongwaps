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
}

function LessonItemBase({
  lesson,
  isSelected,
  isPrevSelected,
  isNextSelected,
  onToggle,
  accentColor,
  edgeHex,
}: LessonItemProps) {
  const isLocked = lesson.state === 'locked';
  const landscapeSrc = LESSON_LANDSCAPE_ART[lesson.id];
  const englishTitle = getEnglishLessonTitle(lesson.title);
  let containerClasses = 'mb-3 rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface hover:bg-ui-hover';
  let innerDivider = null;

  if (isSelected) {
    if (!isPrevSelected && !isNextSelected) {
      containerClasses = 'mb-3 rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface';
    } else if (!isPrevSelected && isNextSelected) {
      containerClasses = 'mb-0 rounded-t-feature border-ui-border bg-ui-surface';
      innerDivider = <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-ui-divider" />;
    } else if (isPrevSelected && isNextSelected) {
      containerClasses = 'mb-0 border-ui-border bg-ui-surface';
      innerDivider = <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-ui-divider" />;
    } else {
      containerClasses = 'mb-3 rounded-b-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface';
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
      className={`relative flex min-h-20 min-w-0 items-center transition-colors duration-300 ${containerClasses}`}
    >
      {innerDivider}
      <button
        type="button"
        disabled={isLocked}
        onClick={() => onToggle(lesson.id)}
        aria-pressed={isSelected}
        className="group flex min-w-0 flex-1 items-center gap-4 self-stretch rounded-[inherit] p-4 text-left outline-none focus-ring disabled:cursor-not-allowed"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
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
            <span className="absolute grid h-7 w-7 place-items-center rounded-full bg-ui-surface text-ui-muted border-b-[length:var(--depth-sm)] border-ui-divider">
              <AppIcon name="lock" size={16} />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`mb-0.5 block text-[11px] font-extrabold uppercase tracking-widest transition-colors ${
            isSelected ? accentColor : 'text-ui-muted'
          }`}>
            {lesson.label}
          </span>
          <span className={`block truncate text-[17px] font-extrabold transition-colors ${
            isSelected ? 'text-ui-ink' : 'text-ui-muted group-hover:text-ui-ink'
          }`}>
            {englishTitle}
          </span>
        </span>
      </button>
    </motion.div>
  );
}

export const LessonItem = memo(LessonItemBase);
