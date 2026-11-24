import { SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface CornerSpeakerProps {
  onClick: () => void;
  label?: string;
  active?: boolean;
  className?: string;
}

export function CornerSpeaker({ onClick, label = 'Play audio', active = false, className }: CornerSpeakerProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={cn(
        'absolute right-2 top-2 flex size-[42px] cursor-pointer items-center justify-center rounded-sm transition-colors duration-150 focus-ring',
        active
          ? 'bg-brand-primary-soft text-brand-primary'
          : 'text-ui-muted hover:bg-ui-hover hover:text-ui-ink-strong active:bg-brand-primary-soft active:text-brand-primary',
        className,
      )}
    >
      <SpeakerIcon className="size-5.5" />
    </button>
  );
}

interface CenterSpeakerProps {
  onClick: () => void;
  label?: string;
  active?: boolean;
  className?: string;
}

export function CenterSpeaker({ onClick, label = 'Listen', active = false, className }: CenterSpeakerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-15 w-18 cursor-pointer items-center justify-center rounded-[18px] border-2 tactile [--tactile-depth:var(--depth-lg)] transition-[transform,border-color,background-color] duration-100 focus-ring',
        active
          ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
          : 'border-ui-border bg-ui-surface text-brand-primary hover:bg-ui-hover',
        className,
      )}
    >
      <SpeakerIcon className="size-[30px]" />
    </button>
  );
}
