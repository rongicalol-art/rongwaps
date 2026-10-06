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
  /** `soft` swaps the solid brand pill for a quiet neutral one (for full-colour icons). */
  tone?: 'solid' | 'soft';
  /** Icon-only options show their label in a tooltip on hover (hover-capable pointers only). */
  hoverLabels?: boolean;
  /** Side the hover label opens on. Defaults to `left` when vertical, otherwise `top`. */
  tooltipSide?: 'top' | 'left' | 'right';
}

const tooltipPlacement = {
  top: 'bottom-full left-1/2 mb-3 -translate-x-1/2',
  left: 'right-full top-1/2 mr-3 -translate-y-1/2',
  right: 'left-full top-1/2 ml-3 -translate-y-1/2',
} as const;

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  orientation = 'horizontal',
  layoutId: customLayoutId,
  tone = 'solid',
  hoverLabels = false,
  tooltipSide,
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
                ? tone === 'soft' ? 'text-ui-ink-strong' : 'text-white'
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
                className={cn(
                  'absolute inset-0 rounded-control border-b-[length:var(--depth-sm)] border-brand-primary-edge bg-brand-primary shadow-ambient-sm',
                  tone === 'soft' && 'border-ui-border bg-ui-hover shadow-none',
                )}
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
            {hoverLabels && !showLabel && (
              <span
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute z-50 hidden items-center whitespace-nowrap rounded-control',
                  tooltipPlacement[tooltipSide ?? (orientation === 'vertical' ? 'left' : 'top')],
                  'border-b-2 border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-black uppercase tracking-wider text-ui-ink-strong shadow-md group-aria-expanded:!hidden [@media(hover:hover)]:group-hover:flex',
                )}
              >
                {option.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
