import type { ReactNode } from 'react';
import type { PracticeIconName } from '../../../types/models';

const USA_FLAG = new URL('../../../assets/flags/us-wide.svg', import.meta.url).href;
const TAIWAN_FLAG = new URL('../../../assets/flags/tw-wide.svg', import.meta.url).href;

/** Flat place glyphs for the route map, drawn in a 40×40 box around (0, 0) with token colours. No text in the art. */
const INK = 'stroke-ui-ink-strong';
const line = `${INK} [stroke-width:2.4] [stroke-linejoin:round] [stroke-linecap:round]`;

/** Places drawn as a bare flag instead of an icon in a pin. */
export const FLAG_ICONS: ReadonlySet<PracticeIconName> = new Set(['usa', 'taiwan']);

export const ROUTE_ICONS: Record<PracticeIconName, ReactNode> = {
  // Flags as images: 3:2, no outline.
  usa: <image href={USA_FLAG} x="-27" y="-18" width="54" height="36" style={{ clipPath: "inset(0 round 5px)" }} />,
  taiwan: <image href={TAIWAN_FLAG} x="-27" y="-18" width="54" height="36" style={{ clipPath: "inset(0 round 5px)" }} />,
  home: (
    <g>
      <path d="M-17 -2 L0 -17 L17 -2 Z" className={`fill-brand-secondary ${line}`} />
      <rect x="-12" y="-3" width="24" height="18" rx="2" className={`fill-ui-surface ${line}`} />
      <rect x="-4" y="5" width="8" height="10" rx="2" className="fill-ui-ink-strong" />
    </g>
  ),
  school: (
    <g>
      <rect x="-16" y="-5" width="32" height="20" rx="2" className={`fill-brand-primary-wash ${line}`} />
      <path d="M-18 -5 L0 -15 L18 -5 Z" className={`fill-brand-primary ${line}`} />
      <path d="M0 -15 V-25" className={`fill-none ${line}`} />
      <path d="M1 -25 h9 l-3 3 l3 3 h-9 z" className="fill-brand-secondary" />
      <rect x="-4" y="5" width="8" height="10" rx="2" className="fill-ui-ink-strong" />
    </g>
  ),
  restaurant: (
    <g>
      <path d="M-15 0 a15 13 0 0 0 30 0 Z" className={`fill-ui-surface ${line}`} />
      <path d="M-17 0 h34" className={`fill-none ${line}`} />
      <path d="M-6 -4 q-3 -5 0 -10 M1 -4 q-3 -5 0 -10" className={`fill-none ${line}`} />
      <path d="M6 -16 L16 -3 M10 -18 L19 -6" className={`fill-none ${line}`} />
    </g>
  ),
  library: (
    <g>
      <rect x="-15" y="-9" width="30" height="24" rx="2" className={`fill-brand-primary-wash ${line}`} />
      <path d="M0 -14 C-5 -18 -11 -18 -14 -16 V-9 H14 V-16 C11 -18 5 -18 0 -14 Z" className={`fill-ui-surface ${line}`} />
      <path d="M-9 -3 v8 M-3 -3 v8 M3 -3 v8 M9 -3 v8" className={`fill-none ${line}`} />
    </g>
  ),
  hotel: (
    <g>
      <rect x="-12" y="-18" width="24" height="33" rx="2" className={`fill-brand-primary-wash ${line}`} />
      {[[-7, -13], [2, -13], [-7, -4], [2, -4]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="5" rx="1" className="fill-brand-primary" />)}
      <rect x="-3.5" y="6" width="7" height="9" rx="1.5" className="fill-ui-ink-strong" />
    </g>
  ),
  post: (
    <g>
      <rect x="-16" y="-11" width="32" height="22" rx="3" className={`fill-brand-secondary-soft ${line}`} />
      <path d="M-15 -9 L0 3 L15 -9" className={`fill-none ${line}`} />
    </g>
  ),
  cafe: (
    <g>
      <path d="M-13 -6 h20 v8 a10 10 0 0 1 -20 0 z" className={`fill-ui-surface ${line}`} />
      <path d="M7 -3 h3 a4 4 0 0 1 0 8 h-4" className={`fill-none ${line}`} />
      <path d="M-7 -11 q-2 -3 0 -6 M-1 -11 q-2 -3 0 -6" className={`fill-none ${line}`} />
      <path d="M-15 13 h24" className={`fill-none ${line}`} />
    </g>
  ),
  book: (
    <g>
      <path d="M0 -8 C-6 -12 -12 -12 -16 -10 V10 C-12 8 -6 8 0 12 Z" className={`fill-ui-surface ${line}`} />
      <path d="M0 -8 C6 -12 12 -12 16 -10 V10 C12 8 6 8 0 12 Z" className={`fill-brand-primary-wash ${line}`} />
      <path d="M-11 -4 h6 M-11 1 h6 M5 -4 h6 M5 1 h6" className={`fill-none ${line}`} />
    </g>
  ),
};
