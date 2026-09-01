import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  showLabel?: boolean;
  title?: string;
  disabled?: boolean;
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled' | 'onClick' | 'type'>;
}

export interface SegmentedControlProps<T extends string>
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  orientation?: 'horizontal' | 'vertical';
  layoutId?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  orientation = 'horizontal',
  layoutId: customLayoutId,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const autoLayoutId = useId();
  const layoutId = customLayoutId ?? `segmented-control-${autoLayoutId}`;
  const reduceMotion = useReducedMotion();

  const hasCustomPadding = className && /\bp[xytrbl]?-\[?[0-9]/.test(className);
  const hasCustomRounded = className && /\brounded-/.test(className);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative flex items-center gap-1 bg-ui-hover',
        !hasCustomRounded && 'rounded-control',
        !hasCustomPadding && 'p-1',
        orientation === 'vertical' && 'flex-col',
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const showLabel = option.showLabel !== false && Boolean(option.label);
        const { className: buttonClassName, ...buttonProps } = option.buttonProps ?? {};
        return (
          <button
            {...buttonProps}
            key={option.value}
            type="button"
            disabled={option.disabled}
            title={option.title}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'group relative inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-control px-2 text-sm font-extrabold outline-none select-none transition-colors duration-150 focus-ring disabled:cursor-not-allowed disabled:text-ui-muted',
              orientation === 'vertical' && 'justify-start text-left',
              isSelected
                ? 'text-white'
                : 'text-ui-muted-strong hover:bg-ui-surface hover:text-ui-ink-strong',
              buttonClassName,
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={layoutId}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 450,
                        damping: 34,
                        mass: 0.8,
                      }
                }
                className="absolute inset-0 rounded-control border-b-[length:var(--depth-sm)] border-brand-primary-edge bg-brand-primary shadow-ambient-sm"
              />
            )}
            <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
              {option.icon}
              {showLabel ? (
                <span className={cn('truncate', option.icon && 'ml-2')}>{option.label}</span>
              ) : (
                <span className="sr-only">{option.label}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
