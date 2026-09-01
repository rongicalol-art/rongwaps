import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { PosCategory } from '../../data/posInfo';
import {
  formatPosLabel,
  getPosCategory,
  getPosChineseTerm,
  getPosExplanation,
} from '../../utils/posLabels';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

/** Soft tint per word-class family; neutral for helpers. */
const TAG_TONES: Record<PosCategory, string> = {
  noun: 'bg-brand-primary/10',
  verb: 'bg-brand-secondary/10',
  stative: 'bg-feedback-success/10',
  measure: 'bg-feedback-warning/10',
  adverb: 'bg-ui-canvas',
  function: 'bg-ui-canvas',
  phrase: 'bg-ui-canvas',
  other: 'bg-ui-canvas',
};

const DOT_TONES: Record<PosCategory, string> = {
  noun: 'bg-brand-primary',
  verb: 'bg-brand-secondary',
  stative: 'bg-feedback-success',
  measure: 'bg-feedback-warning',
  adverb: 'bg-ui-muted',
  function: 'bg-ui-muted',
  phrase: 'bg-ui-muted',
  other: 'bg-ui-muted',
};

const TOOLTIP_TONES: Record<PosCategory, string> = {
  noun: 'border-brand-primary-edge shadow-[0_3px_0_var(--color-brand-primary-edge)]',
  verb: 'border-brand-secondary-edge shadow-[0_3px_0_var(--color-brand-secondary-edge)]',
  stative: 'border-feedback-success-edge shadow-[0_3px_0_var(--color-feedback-success-edge)]',
  measure: 'border-feedback-warning-edge shadow-[0_3px_0_var(--color-feedback-warning-edge)]',
  adverb: 'border-ui-border shadow-[0_3px_0_var(--color-ui-border)]',
  function: 'border-ui-border shadow-[0_3px_0_var(--color-ui-border)]',
  phrase: 'border-ui-border shadow-[0_3px_0_var(--color-ui-border)]',
  other: 'border-ui-border shadow-[0_3px_0_var(--color-ui-border)]',
};

const ARROW_TONES: Record<PosCategory, string> = {
  noun: 'border-t-brand-primary-edge',
  verb: 'border-t-brand-secondary-edge',
  stative: 'border-t-feedback-success-edge',
  measure: 'border-t-feedback-warning-edge',
  adverb: 'border-t-ui-border',
  function: 'border-t-ui-border',
  phrase: 'border-t-ui-border',
  other: 'border-t-ui-border',
};

const TOOLTIP_DELAY_MS = 220;
const TOOLTIP_GAP = 10;
const ARROW_HALF_WIDTH = 7;

interface PosBadgeProps {
  /** Raw part-of-speech tag from the vocabulary source (e.g. 'N', 'Vs', 'V-sep'). */
  pos?: string | null;
  className?: string;
}

interface Anchor {
  x: number;
  top: number;
  bottom: number;
}

interface TooltipPlacement {
  left: number;
  top: number;
  /** Tooltip-relative x of the arrow tip center. */
  arrowLeft: number;
  above: boolean;
}

/**
 * Compact color-coded tag that expands a vocabulary part-of-speech tag
 * ("N" → "NOUN"). Hovering it opens a learner-friendly explainer with the
 * Chinese term. Renders nothing when the card has no tag.
 */
export function PosBadge({ pos, className = '' }: PosBadgeProps) {
  const label = formatPosLabel(pos);
  const reduceMotion = useReducedMotion();
  const characterPreference = useAppStore((state) => state.characterPreference);
  const tagRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [placement, setPlacement] = useState<TooltipPlacement | null>(null);

  const category = getPosCategory(pos);
  const explanation = getPosExplanation(pos, characterPreference);
  const zhTerm = getPosChineseTerm(pos);

  const updateAnchor = () => {
    const rect = tagRef.current?.getBoundingClientRect();
    setAnchor(rect ? { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom } : null);
  };

  const openTooltip = () => {
    updateAnchor();
    setIsOpen(true);
  };

  const arm = () => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(openTooltip, TOOLTIP_DELAY_MS);
  };

  const disarm = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    setIsOpen(false);
  };

  // Track the tag while the popover is open (rows scroll; the card can move).
  useLayoutEffect(() => {
    if (!isOpen) return;
    updateAnchor();
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);
    return () => {
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [isOpen]);

  // Measure the popover, clamp it inside the viewport, and flip below the
  // tag when there is no room above. The arrow tracks the tag's center even
  // when the popover itself is pushed sideways.
  useLayoutEffect(() => {
    if (!isOpen || !anchor || !tooltipRef.current) return;
    const width = tooltipRef.current.offsetWidth;
    const height = tooltipRef.current.offsetHeight;
    const above = anchor.top > height + TOOLTIP_GAP * 2;
    const left = Math.min(Math.max(8, anchor.x - width / 2), window.innerWidth - width - 8);
    const arrowLeft = Math.min(
      Math.max(anchor.x - left, ARROW_HALF_WIDTH + 5),
      width - ARROW_HALF_WIDTH - 5,
    );
    setPlacement({
      left,
      top: above ? anchor.top - height - TOOLTIP_GAP : anchor.bottom + TOOLTIP_GAP,
      arrowLeft,
      above,
    });
  }, [isOpen, anchor]);

  if (!label) return null;

  const openTransition = reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' as const };

  return (
    <>
      <span
        ref={tagRef}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return;
          arm();
        }}
        onPointerLeave={disarm}
        className={cn(
          'inline-flex shrink-0 select-none cursor-help items-center gap-1 rounded-[6px] px-1.5 py-[3px]',
          'text-[10px] font-black uppercase leading-none tracking-wide text-ui-ink-strong',
          'transition-colors',
          TAG_TONES[category],
          className,
        )}
      >
        <span className={cn('h-[5px] w-[5px] rounded-full', DOT_TONES[category])} />
        {label}
      </span>

      {isOpen && anchor && createPortal(
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60]"
          style={
            placement
              ? { left: placement.left, top: placement.top }
              : {
                  left: anchor.x,
                  top: anchor.top,
                  transform: 'translate(-50%, calc(-100% - 10px))',
                }
          }
        >
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.97, y: (placement?.above ?? true) ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={openTransition}
            style={{ transformOrigin: (placement?.above ?? true) ? '50% 100%' : '50% 0%' }}
            className={cn('relative w-[min(240px,78vw)]')}
          >
            <div className={cn(
              'block rounded-compact border bg-ui-surface px-3.5 py-3 text-left',
              TOOLTIP_TONES[category],
            )}>
              <span className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_TONES[category])} />
                <span className="text-[11px] font-black uppercase tracking-widest text-ui-ink-strong">
                  {label}
                </span>
                {zhTerm && (
                  <span className="ml-auto font-chinese text-[13px] font-bold text-ui-muted">
                    {zhTerm}
                  </span>
                )}
              </span>
              <span className="mt-1.5 block text-[12px] font-bold leading-relaxed text-ui-ink">
                {explanation}
              </span>
            </div>
            <span
              className={cn(
                'absolute border-x-[7px] border-x-transparent border-t-[7px]',
                ARROW_TONES[category],
                (placement?.above ?? true) ? 'top-full' : 'bottom-full rotate-180',
                placement ? '' : 'left-1/2 -translate-x-1/2',
              )}
              style={placement ? { left: placement.arrowLeft - ARROW_HALF_WIDTH } : undefined}
            />
          </motion.div>
        </div>,
        document.body,
      )}
    </>
  );
}
