import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
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
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  orientation = 'horizontal',
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1 rounded-[17px] bg-ui-hover p-1',
        orientation === 'vertical' && 'flex-col',
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
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
              'inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-[13px] px-3 py-2 text-sm font-extrabold text-ui-muted-strong outline-none transition-[background-color,color] hover:bg-ui-surface hover:text-ui-ink-strong focus-visible:ring-4 focus-visible:ring-brand-primary/25 disabled:cursor-not-allowed disabled:text-ui-muted',
              orientation === 'vertical' && 'justify-start text-left',
              isSelected && 'bg-brand-primary text-white hover:bg-brand-primary hover:text-white',
              buttonClassName,
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
