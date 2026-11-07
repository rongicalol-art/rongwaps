import type React from 'react';
import { ToggleSwitch } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

/** Base row: transparent on the surface card, kept apart by an inset bottom hairline. */
const rowClassName = 'w-full border-b-2 border-ui-divider last:border-b-0';

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
        'flex min-h-12 items-center justify-between gap-4 rounded-control px-2 py-2.5 text-left transition-colors hover:bg-ui-hover/60 focus-ring-inline focus-visible:bg-ui-hover/60 focus-visible:ring-inset',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0',
        className,
      )}
      {...props}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold leading-tight text-ui-ink">{label}</span>
        {description && <span className="mt-1 block text-[13px] font-bold leading-snug text-ui-muted-strong">{description}</span>}
      </span>
      <ToggleSwitch checked={checked} />
    </button>
  );
}

/** Settings page group: heading, hairline, then its rows. */
export function SettingsPageSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col', className)}>
      <h2 className="text-lg font-black tracking-tight text-ui-ink-strong sm:text-xl">{title}</h2>
      <div className="mb-3 mt-2 h-px w-full bg-ui-divider" />
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}
