import type React from 'react';
import { AppIcon, SectionEyebrow, ToggleSwitch, type AppIconName } from '../../../lib/widgets';
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

/** Shared surface card that frames one section's control rows without heavy outlines, using tactile bottom border like breakdowns. */
function SettingsControlCard({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-hidden rounded-feature bg-ui-surface shadow-[0_3px_0_var(--color-ui-divider)]', className)}>
      {children}
    </div>
  );
}

/** Rows stack inside a single rounded surface card, separated by inset hairlines. */
export function SettingsControlList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <SettingsControlCard className={className}>{children}</SettingsControlCard>;
}

/** Base row: transparent on the surface card, kept apart by an inset bottom hairline. */
const rowClassName = 'w-full border-b border-ui-divider/70 last:border-b-0';

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
        'flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-left transition-colors hover:bg-ui-surface-hover focus-ring-inline focus-visible:bg-ui-surface-hover focus-visible:ring-inset',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-ui-surface focus-visible:bg-ui-surface focus-visible:ring-0',
        className,
      )}
      {...props}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold leading-tight text-ui-ink">{label}</span>
        {description && <span className="mt-1 block text-[13px] font-bold leading-snug text-ui-muted">{description}</span>}
      </span>
      <ToggleSwitch checked={checked} />
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
        'flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-left transition-colors hover:bg-ui-surface-hover focus-ring-inline focus-visible:bg-ui-surface-hover focus-visible:ring-inset',
        className,
      )}
      {...props}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold leading-tight text-ui-ink">{label}</span>
        {detail && <span className="mt-1 block text-[13px] font-bold leading-snug text-ui-muted">{detail}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
          checked
            ? 'bg-brand-primary text-white shadow-[0_2px_0_var(--color-brand-primary-edge)]'
            : 'bg-ui-canvas text-transparent',
        )}
      >
        <AppIcon name="check" size={13} />
      </span>
    </button>
  );
}
