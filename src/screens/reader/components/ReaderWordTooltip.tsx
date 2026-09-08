import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { ReaderWordPreview } from '../utils/readerWordPreview';
import {
  calculateTooltipPlacement,
  type TooltipPlacement,
} from '../utils/readerTooltipPosition';
import { cn } from '../../../utils/cn';
import { AppIcon } from '../../../lib/widgets/AppIcon';
import { useAppStore } from '../../../store/useAppStore';

export interface ReaderWordTooltipProps {
  preview: ReaderWordPreview;
  anchor: { x: number; top: number; bottom: number };
  /** Speak the word aloud (neural voice with speech-synthesis fallback). */
  onSpeak?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const ICON_BUTTON =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-ring text-white/75 hover:bg-white/10 hover:text-white';

/**
 * Compact word definition card shown on hover (and keyboard focus).
 *
 * Sizing notes:
 * - Mobile: ~92vw but never wider than 340px (≈ screen minus gutters on a
 *   390px phone), definitions scroll past ~38vh so the card never owns the
 *   viewport while the reader scrolls beneath it.
 * - Desktop: the same 340px cap keeps the card from covering the sentence it
 *   is explaining, which is the failure mode for wide definition tooltips.
 * Full dictionary entry is intentionally NOT linked here: long-press / the
 * breakdown surface owns that. This card is read-only info + quick actions.
 */
export const ReaderWordTooltip: React.FC<ReaderWordTooltipProps> = ({
  preview,
  anchor,
  onSpeak,
  onMouseEnter,
  onMouseLeave,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  // Initial fallback placement before DOM measurement
  const [placement, setPlacement] = useState<TooltipPlacement>(() =>
    calculateTooltipPlacement(anchor, { width: 300, height: 120 }),
  );

  // Measure exact rendered dimensions and position relative to viewport
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const width = tooltipRef.current.offsetWidth || 300;
    const height = tooltipRef.current.offsetHeight || 120;
    const nextPlacement = calculateTooltipPlacement(anchor, { width, height });
    setPlacement(nextPlacement);
  }, [anchor, preview]);

  if (typeof document === 'undefined') return null;

  const headword = preview.headword || preview.word;
  const isFavorite = favorites.includes(headword);

  return createPortal(
    <div
      data-reader-word-tooltip="true"
      className="pointer-events-auto fixed z-[90]"
      style={{
        left: `${placement.left}px`,
        top: `${placement.top}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <motion.div
        ref={tooltipRef}
        role="tooltip"
        aria-label={`${preview.word} definition`}
        initial={{ opacity: 0, scale: 0.97, y: placement.above ? 4 : -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
        className="relative w-[min(92vw,340px)] select-none rounded-feature bg-ui-ink-strong px-4 py-3 text-left shadow-ambient-lg"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Word + pinyin header */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 pt-0.5">
            <span className="font-chinese text-[20px] font-black leading-tight text-white">
              {preview.word}
            </span>
            {preview.pinyin && (
              <span className="font-sans text-xs font-black tracking-wide text-brand-primary">
                {preview.pinyin}
              </span>
            )}
          </div>

          {/* Quick actions: hear + favorite, side by side on the header line */}
          <div className="flex shrink-0 items-center gap-1">
            {onSpeak && (
              <button
                type="button"
                aria-label={`Hear ${headword}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeak();
                }}
                className={ICON_BUTTON}
              >
                <AppIcon name="audio" size={17} />
              </button>
            )}
            <button
              type="button"
              aria-label={isFavorite ? `Remove ${headword} from saved words` : `Save ${headword}`}
              aria-pressed={isFavorite}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(headword);
              }}
              className={cn(ICON_BUTTON, isFavorite && 'text-brand-secondary hover:text-brand-secondary')}
            >
              <AppIcon name={isFavorite ? 'bookmarkFilled' : 'bookmark'} size={16} />
            </button>
          </div>
        </div>

        {preview.definitions.length > 0 && (
          <div className="mt-2 max-h-[38vh] space-y-1 overflow-y-auto overscroll-contain pr-1">
            {preview.definitions.map((definition, idx) => (
              <p
                key={idx}
                className="font-sans text-[13px] leading-relaxed break-words text-white/85"
              >
                {definition}
              </p>
            ))}
          </div>
        )}

        {/* Triangle arrow seamlessly matching the universal dark tooltip */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute h-0 w-0 border-x-[6px] border-x-transparent',
            placement.above
              ? 'top-full border-t-[6px] border-t-ui-ink-strong'
              : 'bottom-full border-b-[6px] border-b-ui-ink-strong',
          )}
          style={{ left: `${placement.arrowLeft}px` }}
        />
      </motion.div>
    </div>,
    document.body,
  );
};
