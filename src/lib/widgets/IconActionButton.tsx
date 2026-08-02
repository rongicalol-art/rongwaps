import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type IconActionButtonVariant = 'quiet' | 'surface' | 'danger';

export interface IconActionButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: IconActionButtonVariant;
}

const sizeClasses = {
  sm: 'h-9 w-9 rounded-[11px]',
  md: 'h-10 w-10 rounded-[13px]',
  lg: 'h-11 w-11 rounded-[15px]',
} as const;

const variantClasses: Record<IconActionButtonVariant, string> = {
  quiet: 'border-2 border-transparent bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider',
  surface: 'border-2 border-ui-border bg-ui-surface text-ui-ink hover:bg-ui-hover active:scale-95',
  danger: 'border-2 border-transparent bg-transparent text-feedback-danger hover:bg-feedback-danger/10 active:bg-feedback-danger/15',
};

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(function IconActionButton({
  icon,
  label,
  size = 'md',
  variant = 'quiet',
  className,
  title,
  type = 'button',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center outline-none transition-[transform,background-color,border-color,color] duration-100 focus-visible:ring-4 focus-visible:ring-brand-primary/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-ui-muted disabled:opacity-100 disabled:active:scale-100',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
