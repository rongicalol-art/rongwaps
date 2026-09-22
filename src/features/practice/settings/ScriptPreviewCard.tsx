import { cn } from '../../../utils/cn';

export interface ScriptPreviewCardProps {
  selected: boolean;
  heading: string;
  sample: string;
  onClick: () => void;
  label: string;
  /** Optional font override for the sample, e.g. a specific character stack. */
  sampleClassName?: string;
}

export function ScriptPreviewCard({
  selected,
  heading,
  sample,
  onClick,
  label,
  sampleClassName,
}: ScriptPreviewCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex min-h-[88px] flex-1 flex-col items-center justify-center gap-1 rounded-feature border-2 px-4 py-3 shadow-[0_var(--depth-md)_0_var(--color-ui-border)] outline-none transition-shadow focus-ring',
        selected
          ? 'border-brand-primary bg-brand-primary-soft shadow-[0_var(--depth-md)_0_var(--color-brand-primary-edge)]'
          : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
      )}
    >
      <span className={cn('block text-xs font-extrabold', selected ? 'text-brand-primary-edge' : 'text-ui-muted')}>
        {heading}
      </span>
      <span
        className={cn(
          'font-chinese text-2xl font-normal leading-none sm:text-[28px]',
          selected ? 'text-brand-primary-edge' : 'text-ui-ink',
          sampleClassName,
        )}
      >
        {sample}
      </span>
    </button>
  );
}
