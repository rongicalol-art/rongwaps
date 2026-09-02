import type React from 'react';
import { cn } from '../../utils/cn';
import { AppIcon, type AppIconName } from './AppIcon';

export interface ProgressMetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon?: AppIconName;
  leadingContent?: React.ReactNode;
  accentClassName?: string;
  iconBackgroundClassName?: string;
}

export function ProgressMetricCard({
  label,
  value,
  detail,
  icon,
  leadingContent,
  accentClassName = 'text-brand-primary',
  iconBackgroundClassName = 'bg-brand-primary/10',
  className,
  ...props
}: ProgressMetricCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4',
        className,
      )}
      {...props}
    >
      {leadingContent ?? (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-compact',
            iconBackgroundClassName,
            accentClassName,
          )}
        >
          {icon && <AppIcon name={icon} size={23} />}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn('text-[11px] font-black uppercase tracking-wider', accentClassName)}>
          {label}
        </p>
        <p className="mt-0.5 truncate text-xl font-black leading-tight text-ui-ink-strong">
          {value}
        </p>
        <p className="truncate text-[13px] font-bold text-ui-muted">{detail}</p>
      </div>
    </div>
  );
}
