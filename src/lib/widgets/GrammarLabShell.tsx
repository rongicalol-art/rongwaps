import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface GrammarLabShellProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  takeaway?: ReactNode;
  panelClassName?: string;
}

export function GrammarLabShell({
  eyebrow,
  title,
  description,
  headerAction,
  takeaway,
  panelClassName,
  className,
  children,
  ...props
}: GrammarLabShellProps) {
  return (
    <section
      className={cn('border-t border-ui-divider py-8 sm:py-10', className)}
      {...props}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-brand-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-[24px] font-black leading-[1.15] text-ui-ink-strong sm:text-[30px]">
            {title}
          </h2>
          {description && (
            <div className="mt-2 text-sm font-bold leading-6 text-ui-muted-strong sm:text-[15px]">
              {description}
            </div>
          )}
        </div>
        {headerAction && <div className="w-full shrink-0 sm:w-auto">{headerAction}</div>}
      </header>

      <div className={panelClassName}>{children}</div>

      {takeaway && (
        <div className="mt-4 rounded-[16px] bg-brand-primary/5 px-4 py-3 text-sm font-black leading-6 text-ui-ink sm:text-[15px]">
          {takeaway}
        </div>
      )}
    </section>
  );
}
