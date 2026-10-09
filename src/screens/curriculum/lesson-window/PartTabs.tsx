import { cn } from '../../../utils/cn';
import type { LessonWindowPart } from './useLessonWindowParts';

interface PartTabsProps {
  parts: LessonWindowPart[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

/** Underline tabs: one per part, a book-accent check once the part is done. */
export function PartTabs({ parts, activeIndex, onChange, className }: PartTabsProps) {
  if (parts.length < 2) return null;
  return (
    <div role="tablist" aria-label="Lesson parts" className={cn('flex border-b-2 border-ui-divider', className)}>
      {parts.map((part, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={part.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(index)}
            className={cn(
              '-mb-0.5 flex items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] pb-2.5 pt-3 text-[15px] font-black outline-none focus-ring-inline',
              'flex-1 lg:flex-none lg:px-0 lg:pr-7 lg:text-base',
              isActive ? 'border-brand-primary text-ui-ink-strong' : 'border-transparent text-ui-muted hover:text-ui-muted-strong',
            )}
          >
            {part.isDone && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ui-muted" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Done">
                <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
              </svg>
            )}
            <span>Part {index + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
