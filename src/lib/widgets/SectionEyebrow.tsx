import type { ReactNode } from 'react';

/**
 * Uppercase eyebrow label that heads every section on reading surfaces
 * (character breakdown, dictionary word detail). Keeping all section
 * headers at one small size lets Chinese glyphs stay the visual heroes.
 *
 * Renders an `h2` with an optional count and a right-aligned action slot.
 */
export function SectionEyebrow({ id, title, count, icon, action, className = '' }: {
  id?: string;
  title: string;
  count?: number;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-10 items-center justify-between gap-3 ${className}`}>
      <h2 id={id} className="flex min-w-0 items-center gap-1.5 text-[13px] font-black uppercase tracking-widest text-ui-muted-strong">
        {icon}
        <span className="truncate">{title}</span>
        {count !== undefined && <span className="shrink-0 text-ui-muted normal-case tracking-normal">{count}</span>}
      </h2>
      {action}
    </div>
  );
}
