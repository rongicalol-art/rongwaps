import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';

const startHereHeroImg = new URL('../../assets/images/start-here-hero.webp', import.meta.url).href;

interface StartHereEntryRowProps {
  completedCount: number;
  totalLessons: number;
  passed: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export function StartHereEntryRow({
  completedCount,
  totalLessons,
  passed,
  isSelected,
  onSelect,
  onOpen,
}: StartHereEntryRowProps) {
  const allDone = passed || completedCount >= totalLessons;
  const statusText = passed
    ? 'Ready for Lesson 1'
    : completedCount > 0 ? `${completedCount} of ${totalLessons} done` : null;

  return (
    <button
      type="button"
      onClick={() => {
        if (isSelected) {
          onOpen();
        } else {
          onSelect();
        }
      }}
      onDoubleClick={onOpen}
      aria-pressed={isSelected}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3.5 rounded-control border-2 border-b-[5px] p-3 text-left transition-colors active:scale-[0.98] focus-ring',
        isSelected
          ? 'border-brand-primary bg-brand-primary-soft'
          : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
      )}
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-compact border border-ui-divider bg-ui-hover">
        <img
          src={startHereHeroImg}
          alt=""
          className={cn(
            'h-full w-full object-cover transition-[filter,opacity] duration-200',
            !isSelected && !allDone && 'opacity-60 grayscale',
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold uppercase tracking-widest text-ui-muted">
          Start here
        </span>
        <span
          className={cn(
            'block truncate text-lg font-black leading-tight',
            isSelected || allDone ? 'text-ui-ink-strong' : 'text-ui-muted-strong',
          )}
        >
          Sounds, tones &amp; characters
        </span>
        {statusText && <span className="mt-0.5 block text-sm font-extrabold text-ui-muted-strong">{statusText}</span>}
      </div>

      {allDone ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm text-brand-primary-deep">
          <AppIcon name="check" className="size-5" />
        </span>
      ) : (
        <span
          className={cn(
            'shrink-0 text-ui-muted',
            isSelected && 'text-brand-primary',
          )}
        >
          <AppIcon name="next" className="size-5" />
        </span>
      )}
    </button>
  );
}
