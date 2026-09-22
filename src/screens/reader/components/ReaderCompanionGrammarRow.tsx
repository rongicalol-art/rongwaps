import React, { useCallback } from 'react';
import type { ReaderGrammarPoint } from '../utils/readerStudyTargets';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { useLongPress } from '../../../hooks/useLongPress';
import type { ReaderLocateMode } from '../utils/readerLocate';

export interface ReaderCompanionGrammarRowProps {
  point: ReaderGrammarPoint;
  isLocated: boolean;
  /**
   * Visually quiet row: another part's page, or an essay page the text does
   * not use. The row stays tappable and locatable, it just reads as context.
   */
  dimmed: boolean;
  locateMode: ReaderLocateMode;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  onLocateGrammarPoint?: (point: ReaderGrammarPoint | null) => void;
}

/**
 * One grammar point row. The desktop panel locates the point's sentence on
 * hover and opens the grammar lab on click; the mobile drawer has no hover, so
 * a tap opens the lab and a press-and-hold locates the sentence instead.
 */
export const ReaderCompanionGrammarRow = React.memo(function ReaderCompanionGrammarRow({
  point,
  isLocated,
  dimmed,
  locateMode,
  onOpenGrammarPart,
  onLocateGrammarPoint,
}: ReaderCompanionGrammarRowProps) {
  const isUsed = point.usage !== 'none';
  const canLocate = point.matches.length > 0;
  const tapLocates = locateMode === 'tap' && canLocate;

  const openLab = useCallback(
    () => onOpenGrammarPart?.(point.partId, point.id),
    [onOpenGrammarPart, point.partId, point.id],
  );
  const locate = useCallback(() => {
    if (canLocate) onLocateGrammarPoint?.(point);
  }, [canLocate, onLocateGrammarPoint, point]);
  const clearLocate = useCallback(() => onLocateGrammarPoint?.(null), [onLocateGrammarPoint]);

  const longPress = useLongPress<HTMLButtonElement>({
    onTap: openLab,
    onLongPress: locate,
    disabled: !tapLocates,
  });

  const interactionProps = tapLocates
    ? {
        onPointerDown: longPress.onPointerDown,
        onPointerUp: longPress.onPointerUp,
        onPointerCancel: longPress.onPointerCancel,
        onPointerLeave: longPress.onPointerLeave,
        onContextMenu: longPress.onContextMenu,
        onClick: longPress.onClick,
      }
    : {
        onClick: openLab,
        onMouseEnter: locate,
        onMouseLeave: clearLocate,
        onFocus: locate,
        onBlur: clearLocate,
      };

  const usedLabel = isUsed ? ' (used in this reading)' : ' (not used in this reading)';
  const locateLabel = canLocate
    ? tapLocates
      ? ' · Hold to locate its sentence'
      : ' · Hover to locate its sentence'
    : '';
  const title = isUsed
    ? `${point.usageEvidence ? `Used in this reading: ${point.usageEvidence}` : 'Used in this reading'}${locateLabel}`
    : `Not used in this reading${locateLabel}`;

  return (
    <button
      type="button"
      disabled={!onOpenGrammarPart}
      aria-label={`Open grammar lab for ${point.titleEnglish}${usedLabel}${locateLabel}`}
      title={title}
      {...interactionProps}
      className={cn(
        'group flex w-full items-center justify-between gap-3 rounded-compact px-2.5 py-2 text-left transition-colors hover:bg-ui-hover focus-ring outline-none select-none disabled:cursor-default',
        dimmed && 'opacity-70',
        isLocated && 'bg-feedback-warning-subtle/40 ring-1 ring-feedback-warning-edge/30',
      )}
    >
      {/* Chinese Title on top, English Title underneath (never truncated) */}
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className={cn(
            'font-chinese text-base font-bold leading-snug transition-colors',
            dimmed
              ? 'text-ui-muted group-hover:text-ui-ink-strong'
              : 'text-ui-ink-strong group-hover:text-feedback-warning-edge',
          )}
        >
          {point.titleTraditional}
        </span>
        <span
          className={cn(
            'font-sans text-sm font-bold mt-0.5 leading-snug',
            dimmed ? 'text-ui-muted' : 'text-ui-ink',
          )}
        >
          {point.titleEnglish}
        </span>
      </div>

      {/* Forward arrow */}
      {onOpenGrammarPart && (
        <span className="shrink-0 text-ui-muted group-hover:text-feedback-warning-edge group-hover:translate-x-0.5 transition-all pr-0.5">
          <AppIcon name="forward" size={15} />
        </span>
      )}
    </button>
  );
});
