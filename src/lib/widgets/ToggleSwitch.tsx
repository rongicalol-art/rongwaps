import { cn } from '../../utils/cn';

export interface ToggleSwitchProps {
  checked: boolean;
  className?: string;
}

/**
 * Canonical app toggle switch (tactile white knob + brand track).
 * Presentational and aria-hidden: render it inside the row-level
 * `<button role="switch" aria-checked>` that owns the toggle state.
 */
export function ToggleSwitch({ checked, className }: ToggleSwitchProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block h-7 w-12 shrink-0 transition-colors',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-1 top-1 h-5 rounded-full transition-colors',
          checked ? 'bg-brand-primary' : 'bg-ui-divider',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-0 h-7 w-7 rounded-xs bg-ui-surface border-2 border-b-4 shadow-ambient-sm transition-transform',
          checked
            ? 'translate-x-[20px] border-brand-primary-edge'
            : 'border-ui-border',
        )}
      />
    </span>
  );
}
