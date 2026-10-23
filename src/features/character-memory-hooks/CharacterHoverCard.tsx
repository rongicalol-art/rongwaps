import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, type MotionValue } from 'motion/react';
import { AppIcon, CharacterGlyph } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { renderHookText } from './hookText';
import type { CharacterPartsState } from './useCharacterParts';

const CARD_WIDTH_DEFAULT = 296;
const CARD_WIDTH_3_PARTS = 352;
const EDGE = 12;
const TOOLTIP_GAP = 14;
/** Parts beyond this switch from the equation row to a compact grid. */
const MAX_EQUATION = 3;
const MAX_GRID = 5;

export interface CharacterHoverCardProps {
  open: boolean;
  char: string;
  anchor: { x: number; top: number; bottom: number } | null;
  above?: boolean;
  data: CharacterPartsState;
  /** undefined while loading, null when none; shown only when there are no parts. */
  hook: string | null | undefined;
  magneticX?: MotionValue<number>;
  magneticY?: MotionValue<number>;
}

function Tile({ glyph, compact }: { glyph: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-compact border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface',
        compact ? 'h-11 w-11 sm:h-12 sm:w-12' : 'h-13 w-13 sm:h-14 sm:w-14',
      )}
    >
      <CharacterGlyph
        character={glyph}
        className={cn(
          'leading-none text-ui-ink-strong',
          compact ? 'text-2xl sm:text-[26px]' : 'text-3xl sm:text-[32px]',
        )}
      />
    </span>
  );
}

function ResultTile({ glyph, compact }: { glyph: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-compact border-2 border-brand-primary bg-brand-primary/10',
        compact ? 'h-11 w-11 sm:h-12 sm:w-12' : 'h-13 w-13 sm:h-14 sm:w-14',
      )}
    >
      <CharacterGlyph
        character={glyph}
        className={cn(
          'leading-none text-brand-primary',
          compact ? 'text-2xl sm:text-[26px]' : 'text-3xl sm:text-[32px]',
        )}
      />
    </span>
  );
}

function Skeleton() {
  return (
    <span className="flex items-start justify-center gap-1.5" aria-hidden="true">
      <span className="h-14 w-14 animate-pulse rounded-compact bg-ui-hover" />
      <span className="flex h-14 w-3.5 items-center justify-center text-ui-muted">+</span>
      <span className="h-14 w-14 animate-pulse rounded-compact bg-ui-hover" />
    </span>
  );
}

/**
 * Hover card for a character: its parts as an equation (up to three), a
 * compact grid for longer breakdowns, or its memory hook when it has no
 * parts. Sized to fit comfortably without collision and positioned cleanly
 * relative to the viewport.
 */
export function CharacterHoverCard({
  open,
  char,
  anchor,
  above: initialAboveProp,
  data,
  hook,
  magneticX,
  magneticY,
}: CharacterHoverCardProps) {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    arrowLeft: number;
    above: boolean;
  } | null>(null);

  const { parts } = data;
  const equation = parts.length > 0 && parts.length <= MAX_EQUATION;
  const isThreeParts = equation && parts.length === 3;
  const gridParts = parts.length > 6 ? parts.slice(0, MAX_GRID) : parts;
  const hidden = parts.length - gridParts.length;
  const hasBody = !data.loaded || parts.length > 0 || Boolean(hook);

  const viewport = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const targetWidth = isThreeParts ? CARD_WIDTH_3_PARTS : CARD_WIDTH_DEFAULT;
  const width = Math.min(targetWidth, viewport - EDGE * 2);

  useLayoutEffect(() => {
    if (!open || !anchor || !cardRef.current) {
      setPlacement(null);
      return;
    }
    const cardEl = cardRef.current;
    const measuredWidth = cardEl.offsetWidth || width;
    const measuredHeight = cardEl.offsetHeight || 180;

    const spaceAbove = anchor.top;
    const spaceBelow = window.innerHeight - anchor.bottom;
    const needed = measuredHeight + TOOLTIP_GAP + EDGE;

    // Prefer placing ABOVE unless space above is critically constrained
    const canFitAbove = spaceAbove >= needed;
    const isAbove = canFitAbove || spaceAbove >= spaceBelow;

    const left = Math.min(
      Math.max(EDGE, anchor.x - measuredWidth / 2),
      window.innerWidth - measuredWidth - EDGE,
    );

    const top = isAbove
      ? Math.max(EDGE, anchor.top - measuredHeight - TOOLTIP_GAP)
      : Math.min(window.innerHeight - measuredHeight - EDGE, anchor.bottom + TOOLTIP_GAP);

    const arrowLeft = Math.min(
      Math.max(anchor.x - left, 16),
      measuredWidth - 16,
    );

    setPlacement({ left, top, arrowLeft, above: isAbove });
  }, [open, anchor, data.loaded, parts.length, hook, width]);

  if (!open || !anchor) return null;

  const initialAbove = initialAboveProp ?? true;
  const currentLeft = placement ? placement.left : Math.min(Math.max(EDGE, anchor.x - width / 2), viewport - width - EDGE);
  const currentTop = placement
    ? placement.top
    : initialAbove
      ? Math.max(EDGE, anchor.top - 190 - TOOLTIP_GAP)
      : anchor.bottom + TOOLTIP_GAP;
  const currentAbove = placement ? placement.above : initialAbove;
  const currentArrowLeft = placement ? placement.arrowLeft : width / 2;

  const card = (
    <motion.span
      ref={cardRef}
      key="character-hover-card"
      initial={{ opacity: 0, scale: 0.97, y: currentAbove ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
      style={{ transformOrigin: currentAbove ? '50% 100%' : '50% 0%', width }}
      className="relative block"
    >
      <span className="block rounded-compact border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface px-3.5 py-3 text-left shadow-ambient-sm">
        <span className={cn('flex min-w-0 items-baseline gap-2', hasBody && 'mb-3 border-b-2 border-ui-divider pb-2.5')}>
          <CharacterGlyph character={char} className="text-2xl leading-none text-ui-ink-strong" />
          {data.pinyin && <span className="text-base font-black text-brand-primary">{data.pinyin}</span>}
          {data.meaning && <span className="min-w-0 truncate text-sm font-extrabold text-ui-ink">{data.meaning}</span>}
        </span>

        {!data.loaded ? (
          <Skeleton />
        ) : equation ? (
          <div className="flex items-start justify-center gap-1 sm:gap-1.5 w-full">
            {parts.map((part, index) => (
              <Fragment key={`${part.glyph}-${index}`}>
                {index > 0 && (
                  <span
                    className={cn(
                      'flex shrink-0 items-center justify-center font-black text-ui-muted select-none',
                      isThreeParts ? 'h-11 w-2 sm:h-12 sm:w-2.5 text-sm' : 'h-13 w-3 sm:h-14 sm:w-3.5 text-base',
                    )}
                    aria-hidden="true"
                  >
                    +
                  </span>
                )}
                <div
                  className={cn(
                    'flex flex-col items-center text-center min-w-0 flex-1',
                    isThreeParts ? 'max-w-[62px]' : 'max-w-[72px]',
                  )}
                >
                  <Tile glyph={part.glyph} compact={isThreeParts} />
                  {part.pinyin && (
                    <span className="mt-1 block w-full truncate text-[11px] sm:text-xs font-black leading-tight text-brand-primary">
                      {part.pinyin}
                    </span>
                  )}
                  {part.meaning && (
                    <span
                      className="mt-0.5 block w-full line-clamp-2 break-words text-[10px] sm:text-[11px] font-extrabold leading-tight text-ui-muted-strong"
                      title={part.meaning}
                    >
                      {part.meaning}
                    </span>
                  )}
                </div>
              </Fragment>
            ))}
            <span
              className={cn(
                'flex shrink-0 items-center justify-center font-black text-ui-muted select-none',
                isThreeParts ? 'h-11 w-2 sm:h-12 sm:w-2.5 text-sm' : 'h-13 w-3 sm:h-14 sm:w-3.5 text-base',
              )}
              aria-hidden="true"
            >
              →
            </span>
            <div
              className={cn(
                'flex flex-col items-center text-center min-w-0 flex-1',
                isThreeParts ? 'max-w-[62px]' : 'max-w-[72px]',
              )}
            >
              <ResultTile glyph={char} compact={isThreeParts} />
            </div>
          </div>
        ) : parts.length > 0 ? (
          <span className="grid grid-cols-2 gap-2">
            {gridParts.map((part, index) => (
              <span key={`${part.glyph}-${index}`} className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-x-2 rounded-control border-2 border-ui-border border-b-[length:var(--depth-sm)] bg-ui-surface px-2 py-1.5">
                <CharacterGlyph character={part.glyph} className="flex w-full items-center justify-center text-2xl leading-none text-ui-ink-strong" />
                <span className="min-w-0">
                  {part.pinyin && <span className="block truncate text-xs font-black leading-tight text-brand-primary">{part.pinyin}</span>}
                  {part.meaning && <span className="block truncate text-xs font-extrabold leading-tight text-ui-ink">{part.meaning}</span>}
                </span>
              </span>
            ))}
            {hidden > 0 && (
              <span className="flex items-center justify-center rounded-control bg-ui-canvas text-sm font-black text-ui-muted-strong">+{hidden}</span>
            )}
          </span>
        ) : hook ? (
          <span className="flex items-start gap-2 rounded-control border-2 border-feedback-warning-edge/50 bg-feedback-warning-surface px-2.5 py-2">
            <AppIcon name="sparkles" size={14} className="mt-0.5 shrink-0 text-feedback-warning-edge" />
            <span className="text-[13px] font-bold leading-snug text-ui-ink">{renderHookText(hook)}</span>
          </span>
        ) : null}
      </span>
      {currentAbove ? (
        <>
          <span
            style={{ left: currentArrowLeft }}
            className="absolute top-full -translate-x-1/2 border-x-[8px] border-x-transparent border-t-[8px] border-t-ui-border"
            aria-hidden="true"
          />
          <span
            style={{ left: currentArrowLeft }}
            className="absolute top-full -translate-x-1/2 -mt-[2px] border-x-[6px] border-x-transparent border-t-[6px] border-t-ui-surface"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <span
            style={{ left: currentArrowLeft }}
            className="absolute bottom-full -translate-x-1/2 border-x-[8px] border-x-transparent border-b-[8px] border-b-ui-border"
            aria-hidden="true"
          />
          <span
            style={{ left: currentArrowLeft }}
            className="absolute bottom-full -translate-x-1/2 -mb-[2px] border-x-[6px] border-x-transparent border-b-[6px] border-b-ui-surface"
            aria-hidden="true"
          />
        </>
      )}
    </motion.span>
  );

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-popover"
      style={{
        left: currentLeft,
        top: currentTop,
        width,
      }}
    >
      {magneticX && magneticY ? <motion.div style={{ x: magneticX, y: magneticY }}>{card}</motion.div> : card}
    </div>,
    document.body,
  );
}
