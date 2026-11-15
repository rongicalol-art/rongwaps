import type { ReactNode } from 'react';
import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { HanText } from './HanText';

/** The warm "Memory hook" surface shared by character and word hooks. */
export function HookCard({ label = 'Memory hook', children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <aside
      aria-label="Memory hook"
      className={cn('w-full rounded-feature border-2 border-b-[length:var(--depth-md)] border-feedback-warning-edge bg-feedback-warning-surface px-4 pb-4 pt-3.5 text-left sm:px-5', className)}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <AppIcon name="sparkles" size={13} className="text-feedback-warning-text" />
        <span className="text-[11px] font-black uppercase tracking-wider text-feedback-warning-text">{label}</span>
      </div>
      {children}
    </aside>
  );
}

/** Extra facts behind a quiet, closed toggle: the card carries one explanation, not two. */
export function HookNotes({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <details className="mt-2.5">
      <summary className="w-fit cursor-pointer rounded-compact text-[13px] font-extrabold text-feedback-warning-text focus-ring-inline">Good to know</summary>
      {lines.map((line) => (
        <p key={line} className="mt-1.5 text-sm font-bold leading-snug text-ui-ink"><HanText text={line} /></p>
      ))}
    </details>
  );
}
