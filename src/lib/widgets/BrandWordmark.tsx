import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface BrandWordmarkProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  collapsed?: boolean;
}

export function BrandWordmark({
  name = "Ron's Mandarin",
  collapsed = false,
  className,
  ...props
}: BrandWordmarkProps) {
  const [owner, ...subjectParts] = name.split(' ');
  const subject = subjectParts.join(' ');

  return (
    <div
      role="img"
      aria-label={name}
      className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center', className)}
      {...props}
    >
      <img src="/icons/icon.svg" alt="" aria-hidden="true" width={40} height={40} className="size-10 shrink-0" />

      {!collapsed && (
        <span aria-hidden="true" className="min-w-0 text-[19px] font-black leading-none">
          <span className="text-ui-ink">{owner}</span>{' '}
          <span className="text-feedback-warning-text">{subject}</span>
        </span>
      )}
    </div>
  );
}
