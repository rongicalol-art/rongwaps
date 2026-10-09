/** Card sizing shared by the live card. */
export const CARD_BOX_CLASS =
  'absolute inset-x-0 mx-auto w-[min(100cqw,760px,calc(100cqh*1.1))] h-[min(100cqh,calc(100cqw*1.3))]';

/** Calm paper: flat white, one pressable bottom edge, no shadow. */
export const CARD_SURFACE_CLASS = 'rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-divider bg-ui-surface';

/** Review pass: one honey tone all round, so the thicker bottom edge meets the sides cleanly. */
export const REVIEW_CARD_CLASS = 'border-review-line';

/** The question-side word size in px: the same clamp(min, % of card width, max) the front used to set in CSS. */
export function questionWordPx(len: number, cardWidth: number) {
  const [min, pct, max] = len === 1 ? [88, 29, 220] : len === 2 ? [70, 23, 170] : len === 3 ? [52, 17, 128] : len === 4 ? [40, 14, 104] : len <= 6 ? [30, 10.5, 80] : [24, 8, 60];
  return Math.min(max, Math.max(min, (cardWidth * pct) / 100));
}

/** The word travels from the front to its place on the answer: transform only, a touch of overshoot. */
export const SETTLE_EASE = 'cubic-bezier(0.3, 1.08, 0.4, 1)';
export const SETTLE_MS = 520;
