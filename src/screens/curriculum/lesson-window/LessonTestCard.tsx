import { ActionButton, PlayfulNavIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface LessonTestCardProps {
  questionCount: number;
  best: { correct: number; total: number } | null;
  large?: boolean;
  onStart: () => void;
}

/** In place of the mode list while the Test tab is chosen: what Start opens. */
export function LessonTestCard({ questionCount, best, large = false, onStart }: LessonTestCardProps) {
  return (
    <ActionButton
      variant="secondary"
      size="lg"
      fullWidth
      aria-pressed
      edgeColor="var(--color-brand-primary)"
      onClick={onStart}
      className={cn(
        'justify-start gap-3 px-3 py-2.5 text-left normal-case tracking-normal !border-brand-primary !bg-brand-primary-soft hover:!bg-brand-primary-soft',
        large && 'gap-3.5 px-4 py-3.5',
      )}
    >
      <PlayfulNavIcon name="trueFalse" className={large ? 'h-12 w-12' : 'h-9 w-9'} />
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className={cn('font-black leading-tight text-ui-ink-strong', large ? 'text-lg' : 'text-[17px]')}>Lesson test</span>
        <span className="mt-0.5 truncate text-xs font-bold text-ui-muted">
          {best ? `Best ${best.correct}/${best.total}` : `${questionCount} questions`}
        </span>
      </span>
    </ActionButton>
  );
}
