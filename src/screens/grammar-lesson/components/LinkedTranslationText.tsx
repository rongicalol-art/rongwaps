import type { HTMLAttributes } from 'react';
import type { GrammarTranslationSegment } from '../../../types/models';
import { cn } from '../../../utils/cn';

export interface LinkedTranslationTextProps extends HTMLAttributes<HTMLParagraphElement> {
  segments: GrammarTranslationSegment[];
  activeAlignmentId: string | null;
  onActiveAlignmentChange: (alignmentId: string | null) => void;
}

export function LinkedTranslationText({
  segments,
  activeAlignmentId,
  onActiveAlignmentChange,
  className,
  ...props
}: LinkedTranslationTextProps) {
  return (
    <p className={cn('text-sm font-bold leading-relaxed text-ui-muted-strong', className)} {...props}>
      {segments.map((segment) => {
        if (!segment.alignmentId) return <span key={segment.id}>{segment.text}</span>;
        const isActive = activeAlignmentId === segment.alignmentId;
        return (
          <button
            key={segment.id}
            type="button"
            aria-pressed={isActive}
            onMouseEnter={() => onActiveAlignmentChange(segment.alignmentId ?? null)}
            onMouseLeave={() => onActiveAlignmentChange(null)}
            onFocus={() => onActiveAlignmentChange(segment.alignmentId ?? null)}
            onBlur={() => onActiveAlignmentChange(null)}
            onClick={() => onActiveAlignmentChange(segment.alignmentId ?? null)}
            className={cn(
              'rounded-[6px] px-0.5 text-left font-bold outline-none transition-colors',
              isActive
                ? 'bg-brand-primary text-ui-surface'
                : 'hover:bg-brand-primary/10 hover:text-ui-ink-strong focus-visible:bg-brand-primary/10 focus-visible:ring-2 focus-visible:ring-brand-primary/30',
            )}
          >
            {segment.text}
          </button>
        );
      })}
    </p>
  );
}
