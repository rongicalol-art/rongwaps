/** Card sizing shared by the live card. */
export const CARD_BOX_CLASS =
  'absolute inset-x-0 mx-auto w-[min(100cqw,760px,calc(100cqh*1.1))] h-[min(100cqh,calc(100cqw*1.3))]';

/** Calm paper: flat white, one pressable bottom edge, no shadow. */
export const CARD_SURFACE_CLASS = 'rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-divider bg-ui-surface';

/** The question-side word size in px: the same clamp(min, % of card width, max) the front used to set in CSS. */
export function questionWordPx(len: number, cardWidth: number) {
  const [min, pct, max] = len === 1 ? [88, 29, 220] : len === 2 ? [70, 23, 170] : len === 3 ? [52, 17, 128] : len === 4 ? [40, 14, 104] : len <= 6 ? [30, 10.5, 80] : [24, 8, 60];
  return Math.min(max, Math.max(min, (cardWidth * pct) / 100));
}

/** The word travels from the front to its place on the answer: transform only, a touch of overshoot. */
export const SETTLE_EASE = 'cubic-bezier(0.3, 1.08, 0.4, 1)';
export const SETTLE_MS = 520;

/** Tile look shared by the review sheet and the Cards done sheet: a scaled-down card (2px border, 4px bottom). */
export const TILE_BORDER = '2px 2px 4px 2px';
export const TILE_RADIUS = '14px';
export const TILE_RATIO = 1.3;
export const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

/** Tile word size: the preset size, shrunk so a long word stays inside the tile. */
export const fitFont = (front: string, tileW: number, base: number) =>
  Math.max(14, Math.min(base, (tileW - 20) / Array.from(front).length));
