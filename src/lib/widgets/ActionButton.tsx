import { forwardRef, type ComponentProps, type CSSProperties } from 'react';
import { cn } from '../../utils/cn';

export type ActionButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'success' | 'warning';
export type ActionButtonSize = 'sm' | 'md' | 'lg';

export interface ActionButtonProps extends ComponentProps<'button'> {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  edgeColor?: string;
}

const edgeVariantClasses: Record<ActionButtonVariant, string> = {
  primary: 'bg-[var(--btn-edge,var(--color-brand-primary-edge))]',
  secondary: 'bg-[var(--btn-edge,var(--color-ui-border))]',
  quiet: 'bg-transparent',
  danger: 'bg-[var(--btn-edge,var(--color-feedback-danger-edge))]',
  success: 'bg-[var(--btn-edge,var(--color-feedback-success-edge))]',
  warning: 'bg-[var(--btn-edge,var(--color-feedback-warning-edge))]',
};

const surfaceVariantClasses: Record<ActionButtonVariant, string> = {
  primary: 'bg-brand-primary text-white hover:brightness-105',
  secondary: 'border-2 border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover',
  quiet: 'bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider',
  danger: 'bg-feedback-danger text-white hover:brightness-105',
  success: 'bg-feedback-success text-white hover:brightness-105',
  warning: 'bg-feedback-warning text-ui-ink-strong hover:brightness-105',
};

const sizeConfig: Record<ActionButtonSize, {
  outerRadius: string;
  innerPadding: string;
  depthOffset: string;
  marginClass: string;
  translateClass: string;
  depressedClass: string;
}> = {
  sm: {
    outerRadius: 'rounded-sm text-xs',
    innerPadding: 'min-h-9 px-3 py-1.5',
    depthOffset: 'top-[length:var(--depth-sm)]',
    marginClass: 'mb-[length:var(--depth-sm)]',
    translateClass: 'group-active:translate-y-[length:var(--depth-sm)]',
    depressedClass: 'translate-y-[length:var(--depth-sm)]',
  },
  md: {
    outerRadius: 'rounded-control text-sm',
    innerPadding: 'min-h-11 px-4 py-2.5',
    depthOffset: 'top-[length:var(--depth-md)]',
    marginClass: 'mb-[length:var(--depth-md)]',
    translateClass: 'group-active:translate-y-[length:var(--depth-md)]',
    depressedClass: 'translate-y-[length:var(--depth-md)]',
  },
  lg: {
    outerRadius: 'rounded-feature text-base',
    innerPadding: 'min-h-13 px-5 py-3',
    depthOffset: 'top-[length:var(--depth-lg)]',
    marginClass: 'mb-[length:var(--depth-lg)]',
    translateClass: 'group-active:translate-y-[length:var(--depth-lg)]',
    depressedClass: 'translate-y-[length:var(--depth-lg)]',
  },
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingLabel = 'Loading',
  edgeColor,
  className,
  style,
  children,
  disabled,
  type = 'button',
  ...props
}, ref) {
  const isDisabled = disabled || loading;
  const buttonStyle: CSSProperties = {
    ...(edgeColor ? ({ '--btn-edge': edgeColor } as CSSProperties) : {}),
    ...style,
  };

  const content = loading ? (
    <>
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      <span>{loadingLabel}</span>
    </>
  ) : children;

  const sizeSpec = sizeConfig[size];

  if (variant === 'quiet') {
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        style={buttonStyle}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-extrabold outline-none select-none transition-colors duration-100 focus-ring',
          'bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider',
          'disabled:pointer-events-none disabled:cursor-not-allowed !disabled:text-ui-muted',
          sizeSpec.innerPadding,
          sizeSpec.outerRadius,
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {content}
      </button>
    );
  }

  const isFullWidth = fullWidth || className?.includes('w-full');
  const isAutoWidth = className?.includes('w-auto');

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={buttonStyle}
      className={cn(
        'group relative inline-flex items-stretch justify-center p-0 border-none bg-transparent outline-none select-none focus-ring',
        'disabled:pointer-events-none disabled:cursor-not-allowed',
        sizeSpec.outerRadius,
        isFullWidth ? 'w-full' : isAutoWidth ? 'w-auto' : undefined,
      )}
      {...props}
    >
      {/* Stationary 3D Depth / Base (Bottom border stays fixed in place, uses disabled edge when inactive) */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 rounded-[inherit]',
          sizeSpec.depthOffset,
          isDisabled
            ? '!bg-brand-disabled-edge'
            : edgeVariantClasses[variant],
        )}
      />

      {/* Moving Front Surface (Pushes down towards baseline on active; inert when disabled) */}
      <span
        className={cn(
          'relative flex w-full items-center justify-center gap-2 font-extrabold rounded-[inherit]',
          'transition-[transform,background-color,border-color,color,filter] duration-150 ease-out',
          sizeSpec.marginClass,
          sizeSpec.innerPadding,
          className,
          isDisabled
            ? '!bg-brand-disabled !border-none !text-white !shadow-none cursor-not-allowed pointer-events-none'
            : cn(
                sizeSpec.translateClass,
                surfaceVariantClasses[variant],
              ),
        )}
      >
        {content}
      </span>
    </button>
  );
});
