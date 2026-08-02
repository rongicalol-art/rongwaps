import type React from 'react';
import { cn } from '../../../utils/cn';

export interface PracticeSettingGroupProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
}

export function PracticeSettingGroup({
  title,
  description,
  className,
  children,
  ...props
}: PracticeSettingGroupProps) {
  return (
    <section className={cn('flex flex-col gap-4 border-b-2 border-ui-divider pb-7 last:border-b-0', className)} {...props}>
      <div>
        <h3 className="text-[17px] font-black text-ui-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm font-bold leading-snug text-ui-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export interface PracticeToggleRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  label: string;
  description?: string;
}

export function PracticeToggleRow({ checked, label, description, className, ...props }: PracticeToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-[18px] border-b-2 px-4 py-3 text-left transition-all active:translate-y-[4px] active:border-b-0',
        checked ? 'border-[#1899D6] bg-[#EAF7FF]' : 'border-ui-border bg-ui-surface',
        className,
      )}
      {...props}
    >
      <span className="min-w-0">
        <span className="block font-extrabold text-ui-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs font-bold leading-snug text-ui-muted">{description}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors', checked ? 'bg-[#1CB0F6]' : 'bg-ui-border')}>
        <span className={cn('block h-5 w-5 rounded-full bg-ui-surface shadow-sm transition-transform', checked && 'translate-x-5')} />
      </span>
    </button>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  detail?: string;
}

export interface PracticeSegmentedControlProps<T extends string> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}

export function PracticeSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  columns = 3,
  className,
  ...props
}: PracticeSegmentedControlProps<T>) {
  return (
    <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3', className)} {...props}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-w-0 rounded-[16px] border-b-2 px-3 py-3 text-center transition-all active:translate-y-[4px] active:border-b-0',
              selected ? 'border-[#1899D6] bg-[#1CB0F6] text-white' : 'border-ui-border bg-ui-surface text-ui-ink',
            )}
          >
            <span className="block truncate text-sm font-black">{option.label}</span>
            {option.detail && <span className={cn('mt-0.5 block text-[11px] font-bold', selected ? 'text-white/80' : 'text-ui-muted')}>{option.detail}</span>}
          </button>
        );
      })}
    </div>
  );
}
