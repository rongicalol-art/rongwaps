import type React from 'react';
import { AppIcon, SectionEyebrow, type AppIconName } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface SettingsSectionProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  /** Optional semantic icon shown beside the section eyebrow. */
  icon?: AppIconName;
  description?: string;
}

export function SettingsSection({
  title,
  icon,
  description,
  className,
  children,
  ...props
}: SettingsSectionProps) {
  return (
    <section className={cn('flex flex-col gap-2', className)} {...props}>
      <SectionEyebrow title={title} icon={icon ? <AppIcon name={icon} size={15} /> : undefined} />
      {description && <p className="px-1 text-xs font-bold leading-snug text-ui-muted">{description}</p>}
      {children}
    </section>
  );
}

/** Shared surface card that frames one section's control rows with a hairline-divided list. */
function SettingsControlCard({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-hidden rounded-[24px] border-2 border-ui-border bg-ui-surface', className)}>
      {children}
    </div>
  );
}

/** Rows stack inside a single rounded surface card, separated by inset hairlines. */
export function SettingsControlList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <SettingsControlCard className={className}>{children}</SettingsControlCard>;
}

/** Base row: transparent on the surface card, kept apart by an inset bottom hairline. */
const rowClassName = 'w-full border-b border-ui-divider last:border-b-0';

export interface SettingsToggleRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  label: string;
  description?: string;
}

export function SettingsToggleRow({ checked, label, description, disabled, className, ...props }: SettingsToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        rowClassName,
        'flex min-h-14 items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors outline-none hover:bg-ui-surface-hover focus-visible:bg-ui-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/40',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-ui-surface focus-visible:bg-ui-surface focus-visible:ring-0',
        className,
      )}
      {...props}
    >
      <span className="min-w-0">
        <span className="block font-extrabold text-ui-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs font-bold leading-snug text-ui-muted">{description}</span>}
      </span>
      <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-primary' : 'bg-ui-border')}>
        <span className={cn('absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
      </span>
    </button>
  );
}

export interface SettingsRadioRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  label: React.ReactNode;
  detail?: string;
}

export function SettingsRadioRow({ checked, label, detail, className, ...props }: SettingsRadioRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        rowClassName,
        'flex min-h-14 items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors outline-none hover:bg-ui-surface-hover focus-visible:bg-ui-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/40',
        className,
      )}
      {...props}
    >
      <span className="min-w-0">
        <span className="block font-extrabold text-ui-ink">{label}</span>
        {detail && <span className="mt-0.5 block text-xs font-bold leading-snug text-ui-muted">{detail}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked ? 'border-brand-primary bg-brand-primary text-white' : 'border-ui-border bg-ui-surface text-transparent',
        )}
      >
        <AppIcon name="check" size={13} />
      </span>
    </button>
  );
}

export interface SettingsSliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  valueLabel?: string;
  startLabel?: string;
  endLabel?: string;
  hint?: string;
  step?: number;
  className?: string;
}

export function SettingsSliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueLabel = String(value),
  startLabel,
  endLabel,
  hint,
  className,
}: SettingsSliderRowProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn(rowClassName, 'px-5 py-4', className)}>
      <span className="mb-3 flex items-center justify-between gap-3">
        <span className="font-extrabold text-ui-ink">{label}</span>
        <span className="rounded-full bg-brand-primary-soft px-2.5 py-1 text-[11px] font-black tabular-nums text-brand-primary-edge">{valueLabel}</span>
      </span>
      <span className="relative block h-7">
        <span className="absolute left-0 right-0 top-2 h-3 rounded-full bg-brand-primary-track" />
        <span className="absolute left-0 top-2 h-3 rounded-full bg-brand-primary" style={{ width: `${percentage}%` }} />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          className="absolute inset-x-0 top-0 h-7 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-8px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-primary [&::-webkit-slider-thumb]:shadow-md focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-brand-primary-soft-edge"
        />
      </span>
      {(startLabel || endLabel) && (
        <span className="mt-1.5 flex justify-between text-[11px] font-extrabold text-ui-muted">
          <span>{startLabel}</span><span>{endLabel}</span>
        </span>
      )}
      {hint && <p className="mt-2 text-xs font-bold leading-snug text-ui-muted">{hint}</p>}
    </div>
  );
}
