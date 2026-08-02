import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';

export interface DisclosureLineProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
}

export function DisclosureLine({
  title,
  description,
  className,
  children,
  ...props
}: DisclosureLineProps) {
  return (
    <details
      className={cn('group border-y border-ui-divider', className)}
      {...props}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none transition-colors hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-black text-ui-ink-strong">{title}</span>
          {description && (
            <span className="mt-0.5 block text-xs font-bold text-ui-muted-strong">{description}</span>
          )}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-hover text-ui-muted-strong transition-transform group-open:rotate-180">
          <AppIcon name="expand" size={17} />
        </span>
      </summary>
      <div className="border-t border-ui-divider">{children}</div>
    </details>
  );
}
