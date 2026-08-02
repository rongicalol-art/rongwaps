import { AppIcon, Soft3DButton } from '../../../lib/widgets';
import type { CourseLessonProgress } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface LearningPathCardProps {
  lesson: CourseLessonProgress;
  onToggle: (id: number) => void;
}

const stateLabels = {
  current: 'Current lesson',
  completed: 'Completed',
  available: 'Available',
  locked: 'Locked',
} as const;

export function LearningPathCard({ lesson, onToggle }: LearningPathCardProps) {
  const isLocked = lesson.state === 'locked';
  const isCurrent = lesson.state === 'current';
  const isCompleted = lesson.state === 'completed';
  const progress = lesson.wordCount > 0
    ? Math.round((lesson.learnedCount / lesson.wordCount) * 100)
    : 0;

  return (
    <Soft3DButton
      type="button"
      variant="custom"
      depth="sm"
      disabled={isLocked}
      aria-pressed={lesson.isSelected}
      aria-label={`${lesson.label}: ${stateLabels[lesson.state]}`}
      onClick={() => onToggle(lesson.id)}
      className={cn(
        'relative z-10 min-h-[106px] items-stretch justify-start rounded-[17px] px-3.5 py-3 text-left normal-case tracking-normal shadow-none hover:scale-[1.01] lg:min-h-[clamp(88px,12.5dvh,106px)] lg:px-[clamp(0.65rem,1.45dvh,0.875rem)] lg:py-[clamp(0.55rem,1.35dvh,0.75rem)]',
        isCurrent && 'border-x-[2px] border-t-[2px] border-brand-primary bg-ui-surface text-ui-ink-strong',
        isCompleted && 'border-feedback-success bg-ui-surface text-ui-ink-strong',
        lesson.state === 'available' && 'border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-surface-hover',
        isLocked && 'border-ui-border bg-ui-hover text-ui-muted',
      )}
    >
      <span className="flex w-full min-w-0 items-start gap-2.5">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] lg:h-[clamp(34px,5dvh,40px)] lg:w-[clamp(34px,5dvh,40px)]',
            isCurrent && 'bg-brand-primary text-white',
            isCompleted && 'bg-[#E8F9DC] text-feedback-success',
            lesson.state === 'available' && 'bg-[#E8F9DC] text-feedback-success',
            isLocked && 'bg-ui-border text-ui-muted',
          )}
        >
          <AppIcon
            name={isLocked ? 'lock' : isCompleted ? 'check' : isCurrent ? 'books' : 'bookmark'}
            size={20}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-ui-muted">
            {lesson.label}
          </span>
          <span className="mt-0.5 block truncate font-chinese text-[17px] font-bold leading-tight text-ui-ink-strong lg:text-[clamp(15px,2dvh,17px)]">
            {lesson.previewChinese || lesson.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-bold text-ui-muted-strong lg:text-[clamp(10px,1.35dvh,11px)]">
            {lesson.previewEnglish || stateLabels[lesson.state]}
          </span>
        </span>
      </span>

      {isCurrent && (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ui-divider lg:mt-[clamp(0.35rem,1dvh,0.5rem)]">
          <span
            className="block h-full rounded-full bg-brand-primary"
            style={{ width: `${Math.max(12, progress)}%` }}
          />
        </span>
      )}
    </Soft3DButton>
  );
}
