import { useEffect, useState } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { getCachedMnemonic } from '../../../services/mnemonicCache';
import { numberToToneMarks } from '../../../utils/pinyin';
import { normalizeMnemonic, renderHookText } from '../../character-memory-hooks';

/**
 * Inline "breakdown" card shown inside the practice bottom bar when the
 * breakdown button is pressed. It expands in place — characters, pinyin,
 * meaning and the word's memory hook — instead of opening the full breakdown
 * screen (which is reserved for pressing a character itself).
 */
export interface BreakdownExpandPanelProps {
  front: string;
  pinyin?: string;
  meaning: string;
  onClose?: () => void;
  onOpenDetails?: () => void;
}

export function BreakdownExpandPanel({
  front,
  pinyin,
  meaning,
  onClose,
  onOpenDetails,
}: BreakdownExpandPanelProps) {
  const [hook, setHook] = useState<string | null | undefined>(undefined);
  const [hookLoaded, setHookLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getCachedMnemonic(`word_${front}`).then((raw) => {
      if (cancelled) return;
      setHook(normalizeMnemonic(raw));
      setHookLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [front]);

  return (
    <div className="relative rounded-feature border-2 border-ui-border/70 bg-ui-surface p-4 sm:p-5 shadow-ambient-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          <AppIcon name="breakdown" size={14} className="text-ui-ink-strong" />
          <span>Word breakdown</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close breakdown"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink focus-ring"
          >
            <AppIcon name="close" size={14} />
          </button>
        )}
      </div>

      {/* Main vocabulary lockup */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-chinese text-3xl sm:text-4xl font-extrabold leading-none text-ui-ink-strong">
          {front}
        </span>
        {pinyin && (
          <span className="text-sm sm:text-base font-bold text-ui-muted-strong">
            {numberToToneMarks(pinyin)}
          </span>
        )}
        <span className="text-sm sm:text-base font-extrabold text-ui-ink">
          &bull; {meaning}
        </span>
      </div>

      {/* Memory hook (rendered only if one exists) */}
      {hookLoaded && hook && (
        <div className="mt-3 flex items-start gap-2.5 rounded-control border border-feedback-warning-edge/40 bg-feedback-warning/10 p-3">
          <AppIcon name="sparkles" size={15} className="mt-0.5 shrink-0 text-feedback-warning-edge" />
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-wider text-feedback-warning-edge">
              Memory hook
            </span>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-ui-ink">
              {renderHookText(hook)}
            </p>
          </div>
        </div>
      )}

      {/* Detailed character inspection action */}
      {onOpenDetails && (
        <div className="mt-3 flex justify-end border-t border-ui-border/40 pt-2.5">
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1 rounded-sm text-xs font-black uppercase tracking-wider text-brand-primary transition-opacity hover:opacity-80 focus-ring"
          >
            <span>Inspect characters</span>
            <AppIcon name="forward" size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
