import { CustomProgressBar, ScreenHeader } from '../../../lib/widgets';

interface ReadingLessonHeaderProps {
  lessonId: number;
  partId: number;
  step: number;
  stepCount: number;
  stepLabel: string;
  onClose: () => void;
}

export function ReadingLessonHeader({
  lessonId,
  partId,
  step,
  stepCount,
  stepLabel,
  onClose,
}: ReadingLessonHeaderProps) {
  return (
    <ScreenHeader
      onClose={onClose}
      maxWidth="none"
      centerContent={(
        <div className="w-full min-w-0 text-left">
          <p className="truncate text-[10px] font-black leading-none text-brand-primary">
            Lesson {lessonId} · Part {partId}
          </p>
          <h1 className="mt-0.5 truncate text-sm font-black leading-tight text-ui-ink-strong sm:text-base">
            Reading · {stepLabel}
          </h1>
          <CustomProgressBar progress={((step + 1) / stepCount) * 100} size="sm" className="mt-1 max-w-3xl" />
        </div>
      )}
      rightAction={(
        <p className="hidden rounded-[12px] bg-ui-hover px-3 py-2 text-xs font-black text-ui-muted-strong sm:block">
          Step {step + 1} of {stepCount}
        </p>
      )}
      className="border-b-0 bg-transparent shadow-none"
    />
  );
}
