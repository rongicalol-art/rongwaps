import { useEffect, useState } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { getCachedMnemonic } from '../../../services/aiService';
import { numberToToneMarks } from '../../../utils/pinyin';
import { normalizeMnemonic, renderHookText } from '../../character-memory-hooks/hookText';

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
}

function getFrontFontSize(len: number) {
  if (len <= 2) return 'text-[34px]';
  if (len <= 4) return 'text-[28px]';
  return 'text-[22px]';
}

export function BreakdownExpandPanel({ front, pinyin, meaning }: BreakdownExpandPanelProps) {
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
    <div className="rounded-[16px] border border-ui-border bg-white p-4 shadow-[0_3px_0_var(--color-ui-border)]">
      <div className="flex items-center gap-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-ui-surface shadow-[0_2px_0_var(--color-brand-primary-edge)]">
          <AppIcon name="breakdown" size={13} />
        </span>
        <span className="text-[11px] font-black uppercase tracking-widest text-ui-ink-strong">
          Breakdown
        </span>
        <AppIcon name="sparkles" size={12} className="text-feedback-warning" />
      </div>

      <div className="mt-3 flex min-w-0 items-baseline justify-between gap-3">
        <span className={`${getFrontFontSize(front.length)} shrink-0 font-chinese leading-none text-ui-ink-strong`}>
          {front}
        </span>
        <span className="min-w-0 text-right text-[15px] font-extrabold leading-snug text-ui-ink">
          {meaning}
        </span>
      </div>
      {pinyin && (
        <p className="mt-1 text-[13px] font-bold text-ui-muted-strong">
          {numberToToneMarks(pinyin)}
        </p>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-[12px] border border-feedback-warning-edge bg-feedback-warning/10 px-3 py-2.5">
        <AppIcon name="sparkles" size={14} className="mt-[2px] shrink-0 text-feedback-warning" />
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-widest text-feedback-warning-edge">
            Memory hook
          </span>
          <span className="mt-0.5 block text-[12.5px] font-bold leading-relaxed text-ui-ink">
            {hookLoaded ? (
              hook ? (
                renderHookText(hook)
              ) : (
                <span className="text-ui-muted">
                  No memory hook for this word yet — hover its characters for their own hooks.
                </span>
              )
            ) : (
              <span className="mt-1 block h-3 w-full max-w-[220px] animate-pulse rounded-full bg-ui-hover" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
