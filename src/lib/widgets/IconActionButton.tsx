import { forwardRef, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type IconActionButtonVariant = 'quiet' | 'surface' | 'primary' | 'success' | 'danger' | 'warning';

export interface IconActionButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: IconActionButtonVariant;
  edgeColor?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9 rounded-sm',
  md: 'h-10 w-10 rounded-compact',
  lg: 'h-11 w-11 rounded-control',
} as const;

const edgeVariantClasses: Record<IconActionButtonVariant, string> = {
  quiet: 'bg-transparent',
  surface: 'bg-[var(--btn-edge,var(--color-ui-border))]',
  primary: 'bg-[var(--btn-edge,var(--color-brand-primary-edge))]',
  success: 'bg-[var(--btn-edge,var(--color-feedback-success-edge))]',
  danger: 'bg-transparent',
  warning: 'bg-[var(--btn-edge,var(--color-feedback-warning-edge))]',
};

const surfaceVariantClasses: Record<IconActionButtonVariant, string> = {
  quiet: 'bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider',
  surface: 'border-2 border-ui-border bg-ui-surface text-ui-ink hover:bg-ui-hover',
  primary: 'bg-brand-primary text-white hover:brightness-105',
  success: 'border-2 border-feedback-success-edge bg-feedback-success-surface text-feedback-success-edge hover:brightness-95',
  danger: 'bg-transparent text-feedback-danger hover:bg-feedback-danger/10 active:bg-feedback-danger/15',
  warning: 'border-2 border-feedback-warning-edge bg-ui-surface text-feedback-warning-edge hover:bg-ui-hover',
};

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(function IconActionButton({
  icon,
  label,
  size = 'md',
  variant = 'quiet',
  edgeColor,
  className,
  style,
  title,
  type = 'button',
  disabled,
  ...props
}, ref) {
  const buttonStyle: CSSProperties = {
    ...(edgeColor ? ({ '--btn-edge': edgeColor } as CSSProperties) : {}),
    ...style,
  };

  if (variant === 'quiet' || variant === 'danger') {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={title ?? label}
        disabled={disabled}
        style={buttonStyle}
        className={cn(
          'inline-flex shrink-0 items-center justify-center outline-none select-none transition-colors duration-100 focus-ring',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-ui-muted disabled:opacity-100',
          sizeClasses[size],
          surfaceVariantClasses[variant],
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      style={buttonStyle}
      className={cn(
        'group relative inline-flex shrink-0 items-stretch justify-center p-0 border-none bg-transparent outline-none select-none focus-ring',
        'disabled:pointer-events-none disabled:cursor-not-allowed',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {/* Stationary 3D Edge / Base (Bottom border stays fixed in place, uses disabled edge when inactive) */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 top-[length:var(--depth-sm)] rounded-[inherit]',
          disabled
            ? '!bg-brand-disabled-edge'
            : edgeVariantClasses[variant],
        )}
      />

      {/* Moving Front Surface (Pushes down towards baseline on active; inert when disabled) */}
      <span
        className={cn(
          'relative flex w-full h-full items-center justify-center rounded-[inherit] mb-[length:var(--depth-sm)]',
          'transition-[transform,background-color,border-color,color,filter] duration-150 ease-out',
          disabled
            ? '!bg-brand-disabled !border-none !text-white !shadow-none cursor-not-allowed pointer-events-none'
            : cn(
                'group-active:translate-y-[length:var(--depth-sm)]',
                surfaceVariantClasses[variant],
              ),
        )}
      >
        {icon}
      </span>
    </button>
  );
});
