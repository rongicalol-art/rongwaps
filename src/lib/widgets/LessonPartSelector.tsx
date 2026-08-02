import type { HTMLAttributes } from 'react';
import type { CourseLessonPartProgress } from '../../types/models';
import { cn } from '../../utils/cn';
import { Soft3DButton } from './Soft3DButton';

interface LessonPartSelectorProps extends HTMLAttributes<HTMLDivElement> {
  parts: CourseLessonPartProgress[];
  onTogglePart: (partId: number) => void;
  disabled?: boolean;
}

export function LessonPartSelector({
  parts,
  onTogglePart,
  disabled = false,
  className,
  ...props
}: LessonPartSelectorProps) {
  if (parts.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Choose lesson parts"
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    >
      {parts.map((part) => (
        <Soft3DButton
          key={part.id}
          type="button"
          variant="custom"
          depth="sm"
          disabled={disabled}
          aria-pressed={part.isSelected}
          aria-label={`Part ${part.id}, ${part.wordCount} words${part.isSelected ? ', selected' : ''}`}
          onClick={() => onTogglePart(part.id)}
          className={cn(
            'w-auto min-w-[86px] rounded-[14px] px-3 py-2 text-[12px] normal-case tracking-normal hover:scale-[1.02]',
            part.isSelected
              ? 'border-brand-primary-edge bg-brand-primary text-white'
              : 'border-ui-border bg-ui-canvas text-ui-ink hover:bg-ui-surface-hover',
          )}
        >
          <span>Part {part.id}</span>
          <span className={cn('text-[10px]', part.isSelected ? 'text-white/80' : 'text-ui-muted')}>
            {part.wordCount}
          </span>
        </Soft3DButton>
      ))}
    </div>
  );
}

