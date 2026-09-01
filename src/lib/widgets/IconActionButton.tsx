import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type IconActionButtonVariant = 'quiet' | 'surface' | 'danger' | 'warning';

export interface IconActionButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: IconActionButtonVariant;
}

const sizeClasses = {
  sm: 'h-9 w-9 rounded-sm',
  md: 'h-10 w-10 rounded-compact',
  lg: 'h-11 w-11 rounded-control',
} as const;

const variantClasses: Record<IconActionButtonVariant, string> = {
  quiet: 'border-b-[length:var(--depth-sm)] border-transparent bg-transparent text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong active:bg-ui-divider active:translate-y-px active:border-b-0',
  surface: 'border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface text-ui-ink hover:bg-ui-hover active:translate-y-[length:var(--depth-md)] active:border-b-0',
  danger: 'border-b-[length:var(--depth-sm)] border-transparent bg-transparent text-feedback-danger hover:bg-feedback-danger/10 active:bg-feedback-danger/15 active:translate-y-px active:border-b-0',
  warning: 'border-b-[length:var(--depth-md)] border-feedback-warning-edge bg-ui-surface text-feedback-warning-edge hover:bg-feedback-warning/10 active:translate-y-[length:var(--depth-md)] active:border-b-0',
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
        'inline-flex shrink-0 items-center justify-center outline-none transition-[transform,background-color,border-color,color] duration-100 focus-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-ui-muted disabled:opacity-100 disabled:active:scale-100',
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
