import { useLongPress } from '../../../hooks/useLongPress';
import { cn } from '../../../utils/cn';
import type { LessonWindowPart } from './useLessonWindowParts';

interface PartTabsProps {
  parts: LessonWindowPart[];
  selectedPartIds?: number[];
  activeIndex?: number;
  onSelectPart?: (partId: number) => void;
  onTogglePart?: (partId: number) => void;
  onChange?: (index: number) => void;
  className?: string;
}

interface PartTabItemProps {
  part: LessonWindowPart;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

function PartTabItem({ part, index, isSelected, onSelect, onToggle }: PartTabItemProps) {
  const pressHandlers = useLongPress<HTMLButtonElement>({
    onTap: onSelect,
    onLongPress: onToggle,
    delay: 420,
  });

  return (
    <button
      key={part.id}
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-label={`Part ${index + 1}${isSelected ? ', selected' : ''}. Tap to select; hold to include.`}
      title={`Part ${index + 1} · tap to select · hold to include`}
      {...pressHandlers}
      className={cn(
        '-mb-0.5 flex items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] pb-2.5 pt-3 text-[15px] font-black outline-none focus-ring-inline cursor-pointer select-none',
        'flex-1 lg:flex-none lg:px-0 lg:pr-7 lg:text-base',
        isSelected ? 'border-brand-primary text-ui-ink-strong' : 'border-transparent text-ui-muted hover:text-ui-muted-strong',
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
}

/** Underline tabs: one per part, tap to switch, hold to include multiple parts. */
export function PartTabs({
  parts,
  selectedPartIds,
  activeIndex = 0,
  onSelectPart,
  onTogglePart,
  onChange,
  className,
}: PartTabsProps) {
  if (parts.length < 2) return null;

  return (
    <div role="tablist" aria-label="Lesson parts" className={cn('flex border-b-2 border-ui-divider', className)}>
      {parts.map((part, index) => {
        const isSelected = selectedPartIds ? selectedPartIds.includes(part.id) : index === activeIndex;
        const handleSelect = () => {
          if (onSelectPart) onSelectPart(part.id);
          else onChange?.(index);
        };
        const handleToggle = () => {
          if (onTogglePart) onTogglePart(part.id);
          else handleSelect();
        };

        return (
          <PartTabItem
            key={part.id}
            part={part}
            index={index}
            isSelected={isSelected}
            onSelect={handleSelect}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
}
