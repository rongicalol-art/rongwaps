import type React from 'react';
import { cn } from '../../utils/cn';
import { AppIcon, type AppIconName } from './AppIcon';

export interface ProgressMetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon?: AppIconName;
  leadingContent?: React.ReactNode;
  accentClassName?: string;
  iconBackgroundClassName?: string;
  interactive?: boolean;
}

export function ProgressMetricCard({
  label,
  value,
  detail,
  icon,
  leadingContent,
  accentClassName = 'text-brand-primary',
  interactive = false,
  className,
  ...props
}: ProgressMetricCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 text-left transition-all',
        interactive && 'cursor-pointer hover:bg-ui-hover active:border-b-0 active:translate-y-[length:var(--depth-md)] focus-ring select-none',
        className,
      )}
      role={interactive ? 'button' : props.role}
      tabIndex={interactive ? 0 : props.tabIndex}
      {...props}
    >
      {leadingContent ?? (
        <div className={cn('flex shrink-0 items-center justify-center', accentClassName)}>
          {icon && <AppIcon name={icon} size={30} />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-black leading-tight text-ui-ink-strong sm:text-2xl">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-black uppercase tracking-wider text-ui-muted">
          {label}
        </p>
        {detail && <p className="truncate text-[12px] font-bold text-ui-muted-strong">{detail}</p>}
      </div>
      {interactive && (
        <div className="shrink-0 text-ui-muted-strong opacity-60">
          <AppIcon name="next" size={16} />
        </div>
      )}
    </div>
  );
}
