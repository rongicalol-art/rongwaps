import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import type { CourseLessonPartProgress } from '../../../types/models';
import { cn } from '../../../utils/cn';

export interface SelectablePartProgressRailProps {
  parts: CourseLessonPartProgress[];
  onTogglePart: (partId: number) => void;
  disabled?: boolean;
  className?: string;
}

function PartButton({
  selected,
  progress,
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  selected: boolean;
  progress: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'group relative min-h-[56px] min-w-[84px] flex-1 overflow-hidden rounded-control border-2 px-3 py-2 text-left transition-all duration-150 font-sans focus-ring',
        selected
          ? 'border-brand-primary-edge bg-brand-primary-soft text-ui-ink-strong shadow-[0_4px_14px] shadow-brand-primary/15'
          : 'border-ui-border bg-ui-canvas text-ui-muted hover:bg-ui-surface-hover',
        'active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 transition-all duration-500',
          selected ? 'bg-brand-primary/18' : 'bg-brand-primary-track/40',
        )}
        style={{ width: `${progress}%` }}
      />
      <span className="relative z-10 flex h-full flex-col justify-between gap-1.5 font-sans">
        {children}
      </span>
    </button>
  );
}

export function SelectablePartProgressRail({
  parts,
  onTogglePart,
  disabled = false,
  className,
}: SelectablePartProgressRailProps) {
  if (parts.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Choose lesson parts"
      className={cn('flex flex-col gap-2 sm:flex-row font-sans', className)}
    >
      {parts.map((part) => {
        const progress = part.wordCount > 0
          ? Math.round((part.learnedCount / part.wordCount) * 100)
          : 0;

        return (
          <PartButton
            key={part.id}
            selected={part.isSelected}
            progress={progress}
            disabled={disabled}
            onClick={() => onTogglePart(part.id)}
            aria-label={`Part ${part.id}, ${part.wordCount} words, ${progress} percent through this study session${part.isSelected ? ', active' : ''}`}
          >
            <span className="flex items-center justify-between gap-2 font-sans">
              <span className="text-xs font-black">Part {part.id}</span>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-black font-sans',
                part.isSelected ? 'bg-brand-primary text-white' : 'bg-ui-surface text-ui-muted-strong',
              )}>
                {part.isSelected ? 'ON' : 'OFF'}
              </span>
            </span>
            <span className="flex items-end justify-between gap-2 font-sans">
              <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong font-sans">
                {part.wordCount} words
              </span>
              <span className="text-sm font-black tabular-nums text-ui-ink-strong font-sans">{progress}%</span>
            </span>
          </PartButton>
        );
      })}
    </div>
  );
}
