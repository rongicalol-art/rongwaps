import type { ReactNode } from 'react';
import type { PracticeIconName } from '../../../types/models';

const USA_FLAG = new URL('../../../assets/flags/us-wide.svg', import.meta.url).href;
const TAIWAN_FLAG = new URL('../../../assets/flags/tw-wide.svg', import.meta.url).href;

/**
 * Place glyphs for the route map, drawn in a 40×40 box around (0, 0) with token colours: flat shapes,
 * no outlines, each standing on a solid darker edge like the app's buttons. No text in the art.
 */
const stroke = '[stroke-linecap:round] [stroke-linejoin:round]';

/** Places drawn as a bare flag instead of an icon in a pin. */
export const FLAG_ICONS: ReadonlySet<PracticeIconName> = new Set(['usa', 'taiwan']);

export const ROUTE_ICONS: Record<PracticeIconName, ReactNode> = {
  // Flags as images: 3:2, no outline.
  usa: <image href={USA_FLAG} x="-27" y="-18" width="54" height="36" style={{ clipPath: "inset(0 round 5px)" }} />,
  taiwan: <image href={TAIWAN_FLAG} x="-27" y="-18" width="54" height="36" style={{ clipPath: "inset(0 round 5px)" }} />,
  home: (
    <g>
      <rect x="6" y="-17" width="6" height="10" rx="1.5" className="fill-brand-secondary-edge" />
      <rect x="-14" y="2" width="28" height="17" rx="3" className="fill-brand-primary-soft-edge" />
      <rect x="-14" y="-1" width="28" height="17" rx="3" className="fill-brand-primary-wash" />
      <path d="M-19 1L0 -16l19 17z" className="fill-brand-secondary-edge" />
      <path d="M-19 -2L0 -19l19 17z" className="fill-brand-secondary" />
      <path d="M-4 16v-8a4 4 0 0 1 8 0v8z" className="fill-brand-primary-edge" />
      <rect x="6" y="3" width="6" height="6" rx="1.5" className="fill-brand-primary" />
    </g>
  ),
  school: (
    <g>
      <path d="M0 -14V-26" className={`fill-none stroke-ui-ink-strong [stroke-width:2.5] ${stroke}`} />
      <path d="M1 -26h10l-3 3.5 3 3.5H1z" className="fill-brand-secondary" />
      <rect x="-17" y="-2" width="34" height="21" rx="3" className="fill-brand-primary-soft-edge" />
      <rect x="-17" y="-5" width="34" height="21" rx="3" className="fill-brand-primary-wash" />
      <path d="M-20 -3L0 -15l20 12z" className="fill-brand-primary" />
      <rect x="-13" y="1" width="6" height="6" rx="1.5" className="fill-brand-primary" />
      <rect x="7" y="1" width="6" height="6" rx="1.5" className="fill-brand-primary" />
      <path d="M-4.5 16v-6a4.5 4.5 0 0 1 9 0v6z" className="fill-brand-primary-deep" />
    </g>
  ),
  restaurant: (
    <g>
      <path d="M-5 -6q-3 -4 0 -8M2 -6q-3 -4 0 -8" className={`fill-none stroke-ui-border [stroke-width:2.5] ${stroke}`} />
      <path d="M4 -3L15 -19M8 -2L19 -17" className={`fill-none stroke-brand-primary-deep [stroke-width:2.6] ${stroke}`} />
      <rect x="-7" y="11" width="14" height="6" rx="2" className="fill-brand-secondary-edge" />
      <path d="M-18 -1h36a18 15 0 0 1 -36 0z" className="fill-brand-secondary-edge" transform="translate(0 2)" />
      <path d="M-18 -1h36a18 15 0 0 1 -36 0z" className="fill-brand-secondary" />
      <rect x="-19" y="-3" width="38" height="5" rx="2.5" className="fill-brand-secondary-edge" />
      <path d="M-12 4a12 8 0 0 0 9 6" className={`fill-none stroke-brand-on-primary opacity-40 [stroke-width:2.5] ${stroke}`} />
    </g>
  ),
  library: (
    <g>
      <rect x="-19" y="14" width="38" height="5" rx="2" className="fill-brand-primary-edge" />
      {[-14, -5, 4, 13].map((x) => <rect key={x} x={x - 1.5} y="-3" width="5" height="17" rx="1" className="fill-brand-primary-wash" />)}
      <rect x="-19" y="-7" width="38" height="5" rx="2" className="fill-brand-primary-edge" />
      <path d="M-20 -6L0 -19l20 13z" className="fill-brand-primary" />
      <circle cy="-11" r="2.5" className="fill-brand-secondary" />
    </g>
  ),
  hotel: (
    <g>
      <rect x="-13" y="-17" width="26" height="36" rx="3" className="fill-brand-primary-edge" />
      <rect x="-13" y="-20" width="26" height="36" rx="3" className="fill-brand-primary" />
      {[[-8, -14], [2, -14], [-8, -6], [2, -6]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="6" height="5" rx="1.2" className="fill-brand-primary-wash" />)}
      <path d="M-4 16v-7a4 4 0 0 1 8 0v7z" className="fill-brand-secondary" />
    </g>
  ),
  post: (
    <g>
      <rect x="-18" y="-9" width="36" height="24" rx="4" className="fill-brand-primary-soft-edge" />
      <rect x="-18" y="-12" width="36" height="24" rx="4" className="fill-brand-primary-wash" />
      <path d="M-16 -10L0 2l16 -12" className={`fill-none stroke-brand-primary [stroke-width:2.6] ${stroke}`} />
      <rect x="8" y="2" width="7" height="7" rx="1.5" className="fill-brand-secondary" />
    </g>
  ),
  cafe: (
    <g>
      <path d="M-6 -10q-2 -3 0 -6M0 -10q-2 -3 0 -6" className={`fill-none stroke-ui-border [stroke-width:2.5] ${stroke}`} />
      <ellipse cx="-2" cy="15" rx="17" ry="4" className="fill-brand-primary-edge" />
      <path d="M8 -2h3a5 5 0 0 1 0 10h-4" className={`fill-none stroke-brand-primary-edge [stroke-width:3.5] ${stroke}`} />
      <path d="M-14 -6h22v10a11 11 0 0 1 -22 0z" className="fill-brand-primary" />
      <ellipse cx="-3" cy="-6" rx="11" ry="3" className="fill-brand-secondary-edge" />
    </g>
  ),
  book: (
    <g>
      <path d="M0 -8c-6 -4 -13 -4 -18 -2v22c5 -2 12 -2 18 2c6 -4 13 -4 18 -2v-22c-5 -2 -12 -2 -18 2z" className="fill-brand-primary" transform="translate(0 3)" />
      <path d="M0 -8c-6 -4 -12 -4 -16 -2v20c4 -2 10 -2 16 2z" className="fill-brand-primary-wash" />
      <path d="M0 -8c6 -4 12 -4 16 -2v20c-4 -2 -10 -2 -16 2z" className="fill-ui-surface" />
      <path d="M-11 -3h6M-11 2h6M5 -3h6M5 2h6" className={`fill-none stroke-brand-primary-soft-edge [stroke-width:2] ${stroke}`} />
    </g>
  ),
};
