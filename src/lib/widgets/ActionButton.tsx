import { forwardRef, type ComponentProps } from 'react';
import { cn } from '../../utils/cn';

export type ActionButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'success' | 'warning';
export type ActionButtonSize = 'sm' | 'md' | 'lg';

export interface ActionButtonProps extends ComponentProps<'button'> {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

const variantClasses: Record<ActionButtonVariant, string> = {
  primary: 'border-b-[length:var(--depth-lg)] border-brand-primary-edge bg-brand-primary text-white hover:brightness-105 active:translate-y-[length:var(--depth-lg)] active:border-b-0',
  secondary: 'border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover active:translate-y-[length:var(--depth-md)] active:border-b-0',
  quiet: 'border-b-[length:var(--depth-sm)] border-transparent bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider active:translate-y-[length:var(--depth-sm)] active:border-b-0',
  danger: 'border-b-[length:var(--depth-lg)] border-feedback-danger-edge bg-feedback-danger text-white hover:brightness-105 active:translate-y-[length:var(--depth-lg)] active:border-b-0',
  success: 'border-b-[length:var(--depth-lg)] border-feedback-success-edge bg-feedback-success text-white hover:brightness-105 active:translate-y-[length:var(--depth-lg)] active:border-b-0',
  warning: 'border-b-[length:var(--depth-lg)] border-feedback-warning-edge bg-feedback-warning text-ui-ink-strong hover:brightness-105 active:translate-y-[length:var(--depth-lg)] active:border-b-0',
};

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-9 rounded-sm px-3 py-1.5 text-xs',
  md: 'min-h-11 rounded-control px-4 py-2.5 text-sm',
  lg: 'min-h-13 rounded-feature px-5 py-3 text-base',
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
        'inline-flex items-center justify-center gap-2 font-extrabold outline-none transition-[transform,background-color,border-color,color,filter] duration-100 focus-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-border disabled:text-ui-muted disabled:opacity-100 disabled:active:translate-y-0 disabled:active:scale-100',
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
