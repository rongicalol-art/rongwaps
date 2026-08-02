import { forwardRef, type ComponentProps } from 'react';
import { cn } from '../../utils/cn';

export type ActionButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ActionButtonSize = 'sm' | 'md' | 'lg';

export interface ActionButtonProps extends ComponentProps<'button'> {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

const variantClasses: Record<ActionButtonVariant, string> = {
  primary: 'border-b-[5px] border-brand-primary-edge bg-brand-primary text-white hover:brightness-105 active:translate-y-[5px] active:border-b-0',
  secondary: 'border-b-4 border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover active:translate-y-1 active:border-b-0',
  quiet: 'border-b-2 border-transparent bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider',
  danger: 'border-b-[5px] border-feedback-danger-edge bg-feedback-danger text-white hover:brightness-105 active:translate-y-[5px] active:border-b-0',
};

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-9 rounded-[12px] px-3 py-1.5 text-xs',
  md: 'min-h-11 rounded-[16px] px-4 py-2.5 text-sm',
  lg: 'min-h-13 rounded-[20px] px-5 py-3 text-base',
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingLabel = 'Loading',
  className,
  children,
  disabled,
  type = 'button',
  ...props
}, ref) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-extrabold outline-none transition-[transform,background-color,border-color,color,filter] duration-100 focus-visible:ring-4 focus-visible:ring-brand-primary/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-border disabled:text-ui-muted disabled:opacity-100 disabled:active:translate-y-0 disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          <span>{loadingLabel}</span>
        </>
      ) : children}
    </button>
  );
});
