import { useLongPress } from '../../../hooks/useLongPress';
import { cn } from '../../../utils/cn';
import { visibleProgressWidth } from '../../../utils/srs/progress';

export interface StudyPartButtonProps {
  partId: number;
  cardCount: number;
  progressPercent: number;
  flexWeight: number;
  isSelected: boolean;
  disabled: boolean;
  onSelectPart: (partId: number) => void;
  onTogglePart: (partId: number) => void;
}

export function StudyPartButton({
  partId,
  cardCount,
  progressPercent,
  flexWeight,
  isSelected,
  disabled,
  onSelectPart,
  onTogglePart,
}: StudyPartButtonProps) {
  const pressHandlers = useLongPress<HTMLButtonElement>({
    onTap: () => onSelectPart(partId),
    onLongPress: () => onTogglePart(partId),
    disabled,
  });

  return (
    <button
      type="button"
      disabled={disabled}
      {...pressHandlers}
      aria-pressed={isSelected}
      aria-label={`Part ${partId}, ${cardCount} cards${isSelected ? ', active' : ''}. Tap to switch; hold to include or remove.`}
      title={`Part ${partId} · tap to switch · hold to include/remove`}
      style={{ flex: flexWeight }}
      className={cn(
        'group relative h-5 w-full min-w-12 cursor-pointer select-none overflow-hidden rounded-full transition-colors duration-300 focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        isSelected
          ? 'bg-brand-primary-track'
          : 'bg-brand-primary-track hover:brightness-90',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-brand-primary"
        style={{ opacity: isSelected ? 1 : 0, width: isSelected ? visibleProgressWidth(progressPercent) : '0%' }}
      >
        {progressPercent > 0 && (
          <span className="pointer-events-none absolute left-2 right-2 top-1 h-1 rounded-full bg-white/30" />
        )}
      </span>
    </button>
  );
}
