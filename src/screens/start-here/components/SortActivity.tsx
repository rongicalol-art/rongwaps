import { useEffect, useState } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { SortBin, SortItem } from '../data/types';
import { CenterSpeaker } from './SpeakerControls';

interface SortActivityProps {
  mode?: 'audio' | 'text';
  bins: SortBin[];
  items: SortItem[];
  doneText: string;
  onPlayAudio: (audioKey: string) => void;
  onComplete: () => void;
}

function FormattedBoldText({ text }: { text: string }) {
  const parts = text.split(/(<b>.*?<\/b>)/g);
  return (
    <>
      {parts.map((part, idx) =>
        part.startsWith('<b>') && part.endsWith('</b>') ? (
          <strong key={idx} className="font-black text-ui-ink-strong">
            {part.slice(3, -4)}
          </strong>
        ) : (
          <span key={idx}>{part}</span>
        ),
      )}
    </>
  );
}

function BinIcon({ icon }: { icon?: 'air' | 'noair' | 'none' }) {
  if (!icon || icon === 'none') return null;
  if (icon === 'air') {
    return (
      <svg viewBox="0 0 36 22" fill="none" className="h-5 w-7.5 text-brand-primary" aria-hidden="true">
        <path
          d="M2 8h22a4 4 0 1 0-4-4M2 14h28a4 4 0 1 1-4 4"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 22" fill="none" className="h-5 w-7.5 text-ui-muted" aria-hidden="true">
      <path d="M8 11h20" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export function SortActivity({
  mode = 'audio',
  bins,
  items,
  doneText,
  onPlayAudio,
  onComplete,
}: SortActivityProps) {
  const [cursor, setCursor] = useState(0);
  const [sortedPerBin, setSortedPerBin] = useState<string[][]>(() => bins.map(() => []));
  const [nopeBin, setNopeBin] = useState<number | null>(null);

  const isDone = cursor >= items.length;
  const current = items[cursor];

  useEffect(() => {
    setCursor(0);
    setSortedPerBin(bins.map(() => []));
    setNopeBin(null);
  }, [items, bins]);

  useEffect(() => {
    if (!isDone && mode !== 'text' && current?.audio) {
      onPlayAudio(current.audio);
    }
  }, [cursor, isDone, mode, current, onPlayAudio]);

  const handleBinTap = (binIdx: number) => {
    if (isDone || !current) return;
    if (binIdx === current.bin) {
      const chipText = current.reveal || current.label;
      setSortedPerBin((prev) => prev.map((list, idx) => (idx === binIdx ? [...list, chipText] : list)));
      const nextIdx = cursor + 1;
      setCursor(nextIdx);
      if (nextIdx >= items.length) {
        onComplete();
      }
    } else {
      setNopeBin(binIdx);
      if (current.audio) onPlayAudio(current.audio);
      window.setTimeout(() => setNopeBin((cur) => (cur === binIdx ? null : cur)), 320);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* One slot for the item to sort and, at the end, the result line: the bins below never move. */}
      <div className="flex min-h-[104px] flex-col items-center justify-center">
      {!isDone && current && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-ui-muted">
            {cursor + 1} / {items.length}
          </span>
          {mode === 'text' ? (
            <button
              type="button"
              onClick={() => current.audio && onPlayAudio(current.audio)}
              className="rounded-control border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface px-6 py-3 text-2xl font-black text-ui-ink-strong hover:bg-ui-hover focus-ring"
            >
              {current.label}
            </button>
          ) : (
            <CenterSpeaker
              onClick={() => current.audio && onPlayAudio(current.audio)}
              label={`Hear item ${cursor + 1}`}
            />
          )}
        </div>
      )}

      {isDone && (
        <p className="m-0 flex items-center justify-center gap-2 text-center text-lg font-extrabold text-brand-primary-deep">
          <AppIcon name="check" className="size-5 shrink-0" />
          <span>
            <FormattedBoldText text={doneText} />
          </span>
        </p>
      )}
      </div>

      <div className={cn('grid gap-3', bins.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2')}>
        {bins.map((bin, idx) => (
          <button
            key={bin.label}
            type="button"
            disabled={isDone}
            onClick={() => handleBinTap(idx)}
            className={cn(
              'flex min-h-[144px] flex-col items-center gap-2.5 rounded-[20px] border-2 tactile [--tactile-depth:var(--depth-xl)] bg-ui-surface px-2.5 py-3 transition-[transform,border-color,background-color] duration-100 focus-ring',
              !isDone && 'cursor-pointer hover:bg-ui-hover',
              isDone && 'cursor-default border-ui-divider',
              nopeBin === idx ? 'sh-shake border-feedback-danger' : 'border-ui-border',
            )}
          >
            <span className="flex items-center gap-2 text-lg font-black text-ui-ink-strong">
              <BinIcon icon={bin.icon} />
              <span>{bin.label}</span>
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {(sortedPerBin[idx] ?? []).map((chip, cIdx) => (
                <span
                  key={`${chip}-${cIdx}`}
                  className="sh-chip-drop rounded-[10px] border-2 border-brand-primary-soft-edge bg-brand-primary-soft px-2.5 py-1 text-lg font-black text-ui-ink-strong"
                >
                  {chip}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
