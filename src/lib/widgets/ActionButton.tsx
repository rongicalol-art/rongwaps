import { forwardRef, type ComponentProps, type CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import { SpeakerIcon } from './SpeakerIcon';

export type ActionButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'success' | 'warning';
export type ActionButtonSize = 'sm' | 'md' | 'lg';

export interface ActionButtonProps extends ComponentProps<'button'> {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  /** Outer corner radius: 'control' (16px, default) or 'feature' (24px) for large media tiles. */
  radius?: 'control' | 'feature';
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  edgeColor?: string;
  /**
   * Extra classes for the moving front surface, merged after the variant's own surface
   * classes so a caller's accent fill (folder/book colour) always wins over the default.
   */
  frontClassName?: string;
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
  primary: 'bg-brand-primary text-brand-on-primary hover:brightness-105',
  secondary: 'border-2 border-[var(--btn-edge,var(--color-ui-border))] bg-ui-surface text-ui-muted-strong hover:bg-ui-hover',
  quiet: 'bg-transparent text-brand-primary-deep hover:bg-brand-primary-soft active:bg-brand-primary-wash',
  danger: 'bg-feedback-danger text-ui-on-solid hover:brightness-105',
  success: 'bg-feedback-success text-ui-on-solid hover:brightness-105',
  warning: 'bg-feedback-warning text-feedback-on-warning hover:brightness-105',
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
    outerRadius: 'rounded-control text-base',
    innerPadding: 'min-h-13 px-5 py-3',
    depthOffset: 'top-[length:var(--depth-lg)]',
    marginClass: 'mb-[length:var(--depth-lg)]',
    translateClass: 'group-active:translate-y-[length:var(--depth-lg)]',
    depressedClass: 'translate-y-[length:var(--depth-lg)]',
  },
};

/**
 * Classes that place the button in its parent (outer spacing, max width, self-alignment, grid placement) or hide
 * it go on the whole button. On the moving face they would slide or hide the face but not its fixed edge, which
 * then shows as a grey slab above or beside it.
 */
const PLACEMENT = /^(?:-?m[trblxyse]?-|max-w-|self-|justify-self-|place-self-|order-|col-|row-|hidden$|invisible$|visible$)/;
function splitPlacement(className?: string) {
  const placement: string[] = [];
  const surface: string[] = [];
  for (const token of className?.split(/\s+/).filter(Boolean) ?? []) {
    const utility = token.slice(token.lastIndexOf(':') + 1).replace(/^!/, '');
    (PLACEMENT.test(utility) ? placement : surface).push(token);
  }
  return { placement: placement.join(' '), surface: surface.join(' ') };
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton({
  variant = 'primary',
  size = 'md',
  radius,
  fullWidth = false,
  loading = false,
  loadingLabel = 'Loading',
  edgeColor,
  className,
  frontClassName,
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
      <SpeakerIcon status="playing" size={16} />
      <span>{loadingLabel}</span>
    </>
  ) : children;

  const sizeSpec = sizeConfig[size];
  const outerRadiusClass = radius === 'feature' ? 'rounded-feature' : sizeSpec.outerRadius;

  if (variant === 'quiet') {
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        style={buttonStyle}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-black uppercase tracking-wider outline-none select-none transition-colors duration-100 focus-ring',
          surfaceVariantClasses.quiet,
          'disabled:pointer-events-none disabled:cursor-not-allowed !disabled:text-ui-muted',
          sizeSpec.innerPadding,
          outerRadiusClass,
          fullWidth && 'w-full',
          className,
          frontClassName,
        )}
        {...props}
      >
        {content}
      </button>
    );
  }

  const isFullWidth = fullWidth || className?.includes('w-full');
  const isAutoWidth = className?.includes('w-auto');
  const { placement, surface } = splitPlacement(className);

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
        outerRadiusClass,
        isFullWidth ? 'w-full' : isAutoWidth ? 'w-auto' : undefined,
        placement,
      )}
      {...props}
    >
      {/* Stationary 3D Depth / Base (Bottom border stays fixed in place, uses disabled edge when inactive) */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 rounded-[inherit]',
          sizeSpec.depthOffset,
          disabled
            ? '!bg-brand-disabled-edge'
            : edgeVariantClasses[variant],
        )}
      />

      {/* Moving Front Surface (Pushes down towards baseline on active; inert when disabled) */}
      <span
        className={cn(
          'relative flex w-full items-center justify-center gap-2 font-black uppercase tracking-wider rounded-[inherit]',
          'transition-[transform,background-color,border-color,color,filter] duration-150 ease-out',
          sizeSpec.marginClass,
          sizeSpec.innerPadding,
          surface,
          disabled
            ? '!bg-brand-disabled !border-none !text-white !shadow-none cursor-not-allowed pointer-events-none'
            : cn(
                !loading && sizeSpec.translateClass,
                surfaceVariantClasses[variant],
                frontClassName,
              ),
        )}
      >
        {content}
      </span>
    </button>
  );
});
