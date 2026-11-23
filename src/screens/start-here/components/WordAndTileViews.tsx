import { useEffect, useState } from 'react';
import { cn } from '../../../utils/cn';
import type { PairRow, SpellingRow, WordTileItem } from '../data/types';
import { CornerSpeaker } from './SpeakerControls';
import { ToneContour } from './ToneContour';

interface WordSpotlightViewProps {
  audio: string;
  pinyin: string;
  hanzi?: string;
  meaning: string;
  spotlight?: 'zh' | 'py';
  onPlayAudio: (audioKey: string) => void;
}

export function WordSpotlightView({
  audio,
  pinyin,
  hanzi,
  meaning,
  spotlight,
  onPlayAudio,
}: WordSpotlightViewProps) {
  return (
    <div className="relative flex flex-col items-center gap-3 rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface px-4 py-6">
      <CornerSpeaker onClick={() => onPlayAudio(audio)} label={`Play ${pinyin}`} />
      <div className="flex w-full flex-col items-center gap-1">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <span
            className={cn(
              'text-center text-4xl font-extrabold leading-[1.3] text-ui-ink-strong',
              spotlight === 'zh' && 'sh-spotlight-dim',
            )}
          >
            {pinyin}
          </span>
          {spotlight === 'py' ? (
            <span className="sh-spotlight-label flex items-center gap-1.5 justify-self-start pl-2 text-xs font-extrabold uppercase tracking-widest text-brand-primary-deep whitespace-nowrap">
              <span className="h-0.5 w-3.5 rounded bg-brand-primary" />
              Pinyin
            </span>
          ) : (
            <div />
          )}
        </div>

        {hanzi && (
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
            <div />
            <span
              className={cn(
                'font-chinese text-center text-[88px] font-bold leading-[1.1] text-ui-ink-strong md:text-[96px]',
                spotlight === 'py' && 'sh-spotlight-dim',
              )}
            >
              {hanzi}
            </span>
            {spotlight === 'zh' ? (
              <span className="sh-spotlight-label flex items-center gap-1.5 justify-self-start pl-2 text-xs font-extrabold uppercase tracking-widest text-brand-primary-deep whitespace-nowrap">
                <span className="h-0.5 w-3.5 rounded bg-brand-primary" />
                Characters
              </span>
            ) : (
              <div />
            )}
          </div>
        )}

        <span
          className={cn(
            'text-center text-xl font-extrabold text-ui-muted-strong',
            spotlight && 'sh-spotlight-dim',
          )}
        >
          {meaning}
        </span>
      </div>
    </div>
  );
}

interface TilesViewProps {
  items: WordTileItem[];
  onPlayAudio: (audioKey: string) => void;
}

export function TilesView({ items, onPlayAudio }: TilesViewProps) {
  const [heard, setHeard] = useState<Set<string>>(() => new Set());
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const threeCols = items.length === 3 || items.length === 6;

  return (
    <div className={cn('grid w-full gap-3', threeCols ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2')}>
      {items.map((item, idx) => {
        const active = playingIdx === idx;
        const wasHeard = heard.has(item.audio);
        return (
          <button
            key={`${item.pinyin}-${idx}`}
            type="button"
            onClick={() => {
              setPlayingIdx(idx);
              setHeard((prev) => new Set(prev).add(item.audio));
              onPlayAudio(item.audio);
              window.setTimeout(() => setPlayingIdx((cur) => (cur === idx ? null : cur)), 750);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-control border-2 border-b-[length:var(--depth-lg)] px-2 py-3 text-center transition-[transform,border-color,background-color] duration-100 active:mb-0.75 active:translate-y-0.75 active:border-b-2 focus-ring',
              active || wasHeard
                ? 'border-brand-primary bg-brand-primary-soft'
                : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
            )}
          >
            {item.tone && item.tone !== 5 && (
              <ToneContour tone={item.tone} className="h-[52px] w-22" />
            )}
            {item.hanzi && (
              <span className="font-chinese text-3xl font-bold leading-tight text-ui-ink-strong">{item.hanzi}</span>
            )}
            <span className="text-2xl font-black leading-tight text-ui-ink-strong">{item.pinyin}</span>
            <span className="text-base font-bold text-ui-muted-strong">{item.meaning}</span>
          </button>
        );
      })}
    </div>
  );
}

interface PairsViewProps {
  headers: string[];
  rows: PairRow[];
  onPlayAudio: (audioKey: string) => void;
}

export function PairsView({ headers, rows, onPlayAudio }: PairsViewProps) {
  const [heard, setHeard] = useState<Set<string>>(() => new Set());
  const colCount = rows[0]?.cells.length ?? Math.max(2, headers.length);

  return (
    <div className="rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface px-4 py-5">
      <div
        className="grid items-center gap-x-2.5 gap-y-2.5"
        style={{ gridTemplateColumns: `auto repeat(${colCount}, minmax(0, 1fr))` }}
      >
        <span />
        {headers.slice(0, colCount).map((h) => (
          <span key={h} className="text-center text-xs font-extrabold uppercase tracking-widest text-ui-muted">
            {h}
          </span>
        ))}
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="pr-1 text-sm font-extrabold text-ui-muted-strong">{row.label}</span>
            {row.cells.map((cell) => {
              const hit = heard.has(cell.audio);
              return (
                <button
                  key={`${row.label}-${cell.text}-${cell.audio}`}
                  type="button"
                  onClick={() => {
                    setHeard((prev) => new Set(prev).add(cell.audio));
                    onPlayAudio(cell.audio);
                  }}
                  className={cn(
                    'flex min-h-[50px] cursor-pointer flex-col items-center justify-center rounded-compact border-2 border-b-[length:var(--depth-lg)] px-2 py-1 text-ui-ink-strong transition-[transform,border-color,background-color] duration-100 active:mb-0.75 active:translate-y-0.75 active:border-b-2 focus-ring',
                    hit ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
                  )}
                >
                  <span className="text-2xl font-black leading-none">{cell.text}</span>
                  {cell.sub && <span className="mt-0.5 text-xs font-bold text-ui-muted-strong">{cell.sub}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SpellingViewProps {
  rows: SpellingRow[];
  onPlayAudio: (audioKey: string) => void;
}

export function SpellingView({ rows, onPlayAudio }: SpellingViewProps) {
  const [heard, setHeard] = useState<Set<string>>(() => new Set());

  return (
    <div className="flex w-full flex-col gap-2.5">
      {rows.map((row, idx) => {
        const hit = heard.has(row.audio);
        const rest = row.addedPrefix && row.to.startsWith(row.addedPrefix) ? row.to.slice(row.addedPrefix.length) : row.to;
        return (
          <button
            key={`${row.from}-${row.to}-${idx}`}
            type="button"
            onClick={() => {
              setHeard((prev) => new Set(prev).add(row.audio));
              onPlayAudio(row.audio);
            }}
            className={cn(
              'grid w-full cursor-pointer grid-cols-[48px_28px_1fr_auto] items-center gap-2 rounded-control border-2 border-b-[length:var(--depth-lg)] px-4 py-2 text-left transition-[transform,border-color,background-color] duration-100 active:mb-0.75 active:translate-y-0.75 active:border-b-2 focus-ring',
              hit ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
            )}
          >
            <span style={{ color: 'var(--sh-fin)' }} className="text-center text-3xl font-black">
              {row.from}
            </span>
            <span className="text-center text-2xl font-extrabold text-ui-muted">→</span>
            <span className="text-[36px] font-black leading-tight text-ui-ink-strong">
              {/* The added letter in the initial colour, then the rest of the spelling (not the whole spelling again). */}
              {row.addedPrefix && <span style={{ color: 'var(--sh-ini)' }}>{row.addedPrefix}</span>}
              {row.droppedDots ? (
                <span>
                  {rest.slice(0, -1)}
                  <span className="relative inline-block">
                    u
                    <span
                      style={{ color: 'var(--sh-tone)' }}
                      className="pointer-events-none absolute left-0 right-0 -top-[0.02em] text-center opacity-35"
                    >
                      ¨
                    </span>
                  </span>
                </span>
              ) : (
                rest
              )}
            </span>
            <span className="text-base font-extrabold text-ui-muted-strong">{row.example}</span>
          </button>
        );
      })}
    </div>
  );
}

interface JoinViewProps {
  audio: string;
  left: string;
  right: string;
  result: string;
  droppedDots?: boolean;
  caption: string;
  onPlayAudio: (audioKey: string) => void;
}

export function JoinView({ audio, left, right, result, droppedDots, caption, onPlayAudio }: JoinViewProps) {
  useEffect(() => {
    onPlayAudio(audio);
  }, [audio, onPlayAudio]);

  return (
    <div className="relative flex flex-col items-center gap-3 rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface px-4 py-6">
      <CornerSpeaker onClick={() => onPlayAudio(audio)} label={`Play ${result}`} />
      <div className="flex min-h-[110px] items-center justify-center gap-2.5 text-[54px] font-extrabold text-ui-ink-strong md:text-[64px]">
        <span
          style={{ color: 'var(--sh-ini)' }}
          className="rounded-control border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface px-4 leading-snug"
        >
          {left}
        </span>
        <span className="text-3xl text-ui-muted">+</span>
        <span
          style={{ color: 'var(--sh-fin)' }}
          className="rounded-control border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface px-4 leading-snug"
        >
          {right}
        </span>
        <span className="text-3xl text-ui-muted">=</span>
        <span className="relative">
          {droppedDots && result.endsWith('u') ? (
            <>
              {result.slice(0, -1)}
              <span className="relative inline-block">
                u
                <span
                  style={{ color: 'var(--sh-tone)' }}
                  className="sh-dots-fade pointer-events-none absolute left-0 right-0 -top-[0.02em] text-center"
                >
                  ¨
                </span>
              </span>
            </>
          ) : (
            result
          )}
        </span>
      </div>
      <span className="text-lg font-extrabold text-ui-muted-strong">{caption}</span>
    </div>
  );
}
