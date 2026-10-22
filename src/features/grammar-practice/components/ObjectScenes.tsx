import type { ReactNode } from 'react';
import { ClockFace } from './CountdownScene';

/**
 * Redrawn book pictures of plain objects (no people), in the scene art style: flat shapes, no outlines,
 * every object on a solid darker edge. Keyed by the printed crop (`page:box`) like the other reviewed scenes.
 * Prices, times and numbers are copied from the book picture they replace.
 */

const ROUND = '[stroke-linecap:round] [stroke-linejoin:round]';
const LABEL = 'fill-ui-ink-strong font-sans font-black';

function Art({ alt, children, viewBox = '0 0 320 180' }: { alt: string; children: ReactNode; viewBox?: string }) {
  return (
    <svg role="img" aria-label={alt} viewBox={viewBox} className="mx-auto block h-36 w-auto max-w-full sm:h-44">
      {children}
    </svg>
  );
}

/** A white price tag with a punched hole, its text centred. */
function PriceTag({ x, y, text, width = 70 }: { x: number; y: number; text: string; width?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y="-12" width={width} height="30" rx="8" className="fill-ui-border" />
      <rect x={-width / 2} y="-16" width={width} height="30" rx="8" className="fill-ui-surface" />
      <circle cx={-width / 2 + 10} cy="-1" r="3.5" className="fill-brand-secondary" />
      <text x="6" y="5" textAnchor="middle" className={`${LABEL} text-[16px]`}>{text}</text>
    </g>
  );
}

/** A closed book seen from the front: cover, darker spine, page edge, and its own depth. */
function Book({ x, y, w = 70, h = 92, cover = 'fill-brand-primary', edge = 'fill-brand-primary-edge', worn = false }: {
  x: number; y: number; w?: number; h?: number; cover?: string; edge?: string; worn?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="6" width={w} height={h} rx="7" className={edge} />
      <rect x={w - 10} y="4" width="8" height={h - 4} rx="3" className="fill-ui-surface" />
      <rect x="0" y="0" width={w - 6} height={h} rx="7" className={cover} />
      <rect x="0" y="0" width="12" height={h} rx="6" className={edge} />
      <rect x="22" y="18" width={w - 40} height="12" rx="4" className="fill-ui-surface opacity-80" />
      {worn && (
        <>
          <path d={`M${w - 6} ${h - 22}l-18 22h18z`} className="fill-ui-surface" />
          <path d={`M24 ${h - 30}l14 -8M30 ${h - 18}l10 -5`} className={`fill-none stroke-ui-surface opacity-60 [stroke-width:3] ${ROUND}`} />
        </>
      )}
    </g>
  );
}

/** A four-point sparkle. */
function Sparkle({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  const s = size;
  return <path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}z`} className="fill-brand-secondary" />;
}

/** A wrapped gift with a bow, scaled from a 60-wide box. */
function Gift({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-28" y="-6" width="56" height="50" rx="6" className="fill-brand-primary-edge" />
      <rect x="-28" y="-10" width="56" height="50" rx="6" className="fill-brand-primary" />
      <rect x="-34" y="-24" width="68" height="18" rx="5" className="fill-brand-primary-edge" />
      <rect x="-34" y="-27" width="68" height="17" rx="5" className="fill-brand-primary" />
      <rect x="-6" y="-27" width="12" height="71" className="fill-brand-secondary" />
      <path d="M0 -27c-6 -16 -26 -20 -24 -8c1 7 14 8 24 8zM0 -27c6 -16 26 -20 24 -8c-1 7 -14 8 -24 8z" className="fill-brand-secondary" />
      <circle cy="-27" r="6" className="fill-brand-secondary-edge" />
    </g>
  );
}

/** A round cake on a plate; the decorated one has cream drips, berries and candles. */
function Cake({ x, y, decorated }: { x: number; y: number; decorated: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="44" rx="60" ry="11" className="fill-ui-border" />
      <ellipse cx="0" cy="40" rx="60" ry="11" className="fill-ui-surface" />
      <path d="M-46 0v34a46 12 0 0 0 92 0V0z" className="fill-brand-secondary-edge" />
      <path d="M-46 0v30a46 12 0 0 0 92 0V0z" className="fill-brand-secondary" />
      <ellipse cx="0" cy="0" rx="46" ry="12" className="fill-brand-secondary-soft" />
      {decorated && (
        <>
          <path d="M-46 0v8q6 8 12 0t12 0 12 0 12 0 12 0 12 0 12 0 10 0V0z" className="fill-brand-secondary-soft" />
          {[-30, -10, 10, 30].map((cx) => <circle key={cx} cx={cx} cy={cx % 20 === 0 ? -2 : 3} r="5" className="fill-brand-secondary-edge" />)}
          {[-16, 0, 16].map((cx) => (
            <g key={cx}>
              <rect x={cx - 3} y="-30" width="6" height="24" rx="2" className="fill-brand-primary" />
              <path d={`M${cx} -42q6 6 0 10q-6 -4 0 -10z`} className="fill-brand-secondary" />
            </g>
          ))}
        </>
      )}
    </g>
  );
}

/** A pen lying at an angle: cap, clip and nib. `fancy` gives it a gold band. */
function Pen({ x, y, angle = -30, length = 110, color = 'fill-brand-primary', edge = 'fill-brand-primary-edge', fancy = false }: {
  x: number; y: number; angle?: number; length?: number; color?: string; edge?: string; fancy?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-length / 2} y="-5" width={length} height="16" rx="8" className={edge} />
      <rect x={-length / 2} y="-8" width={length} height="16" rx="8" className={color} />
      <path d={`M${length / 2 - 4} -8l18 8l-18 8z`} className="fill-ui-ink-strong" />
      <rect x={-length / 2 + 10} y="-13" width={length * 0.35} height="5" rx="2.5" className={edge} />
      {fancy && <rect x={-length / 2 + length * 0.42} y="-8" width="8" height="16" className="fill-brand-secondary" />}
    </g>
  );
}

/** A yellow-free pencil: orange hexagon body, wood cone, lead tip and eraser. */
function Pencil({ x, y, angle = -24, length = 170 }: { x: number; y: number; angle?: number; length?: number }) {
  const half = length / 2;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-half} y="-9" width={length - 26} height="22" rx="4" className="fill-brand-secondary-edge" />
      <rect x={-half} y="-13" width={length - 26} height="22" rx="4" className="fill-brand-secondary" />
      <rect x={-half} y="-6" width={length - 26} height="5" className="fill-brand-secondary-edge opacity-50" />
      <path d={`M${half - 26} -13l26 11l-26 11z`} className="fill-brand-secondary-soft" />
      <path d={`M${half - 8} -5.5l8 3.5l-8 3.5z`} className="fill-ui-ink-strong" />
      <rect x={-half - 14} y="-13" width="12" height="22" className="fill-ui-border" />
      <rect x={-half - 28} y="-13" width="16" height="22" rx="6" className="fill-brand-primary-soft-edge" />
    </g>
  );
}

/** A T-shirt (or a long-sleeved jacket with a zip). */
function Shirt({ x, y, scale = 1, color = 'fill-brand-primary', edge = 'fill-brand-primary-edge', jacket = false }: {
  x: number; y: number; scale?: number; color?: string; edge?: string; jacket?: boolean;
}) {
  const body = jacket
    ? 'M-20 -40l-14 6l-26 52l16 8l16 -30v62h56v-62l16 30l16 -8l-26 -52l-14 -6q-6 10 -18 10t-18 -10z'
    : 'M-20 -40l-16 6l-22 24l14 16l12 -10v52h64v-52l12 10l14 -16l-22 -24l-16 -6q-6 10 -20 10t-20 -10z';
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={body} transform="translate(0 5)" className={edge} />
      <path d={body} className={color} />
      {jacket && <path d="M0 -30v68" className={`fill-none stroke-brand-primary-deep [stroke-width:3] ${ROUND}`} />}
    </g>
  );
}

/** A flower: grey-blue stem, two leaves, five round petals. */
function Flower({ x, y, scale = 1, petal = 'fill-brand-secondary' }: { x: number; y: number; scale?: number; petal?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0V58" className={`fill-none stroke-brand-primary-edge [stroke-width:5] ${ROUND}`} />
      <path d="M0 34q-18 -4 -20 -16q14 0 20 12zM0 44q18 -4 20 -16q-14 0 -20 12z" className="fill-brand-primary-edge" />
      {[0, 72, 144, 216, 288].map((turn) => <circle key={turn} cx="0" cy="-13" r="11" transform={`rotate(${turn})`} className={petal} />)}
      <circle r="9" className="fill-brand-secondary-soft" />
    </g>
  );
}

/** A cup on its saucer with steam. */
function Cup({ x, y, scale = 1, steam = true }: { x: number; y: number; scale?: number; steam?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {steam && <path d="M-10 -20q-6 -8 0 -16q6 -8 0 -16M8 -20q-6 -8 0 -16q6 -8 0 -16" className={`fill-none stroke-ui-border [stroke-width:5] ${ROUND}`} />}
      <ellipse cx="0" cy="38" rx="48" ry="10" className="fill-ui-border" />
      <ellipse cx="0" cy="34" rx="48" ry="10" className="fill-ui-surface" />
      <path d="M26 2h6a12 12 0 0 1 0 24h-8" className={`fill-none stroke-brand-primary-edge [stroke-width:7] ${ROUND}`} />
      <path d="M-30 -8h60v14a30 30 0 0 1 -60 0z" className="fill-brand-primary" />
      <ellipse cx="0" cy="-8" rx="30" ry="7" className="fill-brand-secondary-edge" />
    </g>
  );
}

/** A round smiling face. */
function Face({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cy="2.5" r="15" className="fill-brand-secondary-edge" />
      <circle r="15" className="fill-brand-secondary-soft" />
      <circle cx="-5" cy="-3" r="2" className="fill-ui-ink-strong" />
      <circle cx="5" cy="-3" r="2" className="fill-ui-ink-strong" />
      <path d="M-5 5q5 4 10 0" className={`fill-none stroke-ui-ink-strong [stroke-width:2] ${ROUND}`} />
    </g>
  );
}

/** A hanger with a shirt on it. */
function HungShirt({ x, color, edge }: { x: number; color: string; edge: string }) {
  return (
    <g>
      <path d={`M${x} 26v-6a6 6 0 1 1 6 -6M${x - 30} 44l30 -18l30 18z`} className={`fill-none stroke-ui-ink-strong [stroke-width:3] ${ROUND}`} />
      <Shirt x={x} y={92} scale={0.8} color={color} edge={edge} />
    </g>
  );
}

const SCENES: Record<string, (alt: string) => ReactNode> = {
  // p.56: a phone showing 10:21.
  '56:0.602,0.77,0.061,0.082': (alt) => (
    <Art alt={alt} viewBox="0 0 160 200">
      <rect x="34" y="16" width="92" height="176" rx="20" className="fill-ui-ink" />
      <rect x="34" y="8" width="92" height="176" rx="20" className="fill-ui-ink-strong" />
      <rect x="42" y="24" width="76" height="144" rx="10" className="fill-brand-primary-wash" />
      <rect x="66" y="14" width="28" height="5" rx="2.5" className="fill-ui-ink" />
      <text x="80" y="82" textAnchor="middle" className={`${LABEL} text-[26px] tabular-nums`}>10:21</text>
      <rect x="52" y="104" width="24" height="24" rx="7" className="fill-brand-primary" />
      <rect x="84" y="104" width="24" height="24" rx="7" className="fill-brand-secondary" />
      <rect x="52" y="134" width="24" height="24" rx="7" className="fill-brand-primary-soft-edge" />
      <rect x="84" y="134" width="24" height="24" rx="7" className="fill-brand-primary-edge" />
    </Art>
  ),
  // p.73: two books side by side.
  '73:0.647,0.627,0.167,0.054': (alt) => (
    <Art alt={alt}>
      <Book x={70} y={40} />
      <Book x={180} y={40} cover="fill-brand-secondary" edge="fill-brand-secondary-edge" />
    </Art>
  ),
  // p.82: three shirts on hangers, four flowers, and six things to buy.
  '82:0.202,0.246,0.162,0.064': (alt) => (
    <Art alt={alt}>
      <HungShirt x={70} color="fill-brand-primary" edge="fill-brand-primary-edge" />
      <HungShirt x={160} color="fill-brand-secondary" edge="fill-brand-secondary-edge" />
      <HungShirt x={250} color="fill-brand-primary-soft-edge" edge="fill-brand-primary-edge" />
    </Art>
  ),
  '82:0.397,0.248,0.21,0.057': (alt) => (
    <Art alt={alt}>
      {[55, 125, 195, 265].map((x, index) => <Flower key={x} x={x} y={70} petal={index % 2 ? 'fill-brand-primary' : 'fill-brand-secondary'} />)}
    </Art>
  ),
  '82:0.659,0.22,0.202,0.095': (alt) => (
    <Art alt={alt} viewBox="0 0 360 200">
      <Shirt x={55} y={58} scale={0.62} />
      <Pen x={170} y={48} length={90} />
      <Book x={262} y={14} w={52} h={66} cover="fill-brand-secondary" edge="fill-brand-secondary-edge" />
      {[34, 58, 82].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={162} rx="12" ry="15" className="fill-ui-border" />
          <ellipse cx={x} cy={158} rx="12" ry="15" className="fill-ui-surface" />
        </g>
      ))}
      <Flower x={170} y={126} scale={0.7} />
      <g transform="translate(288 150) scale(0.62)"><Cake x={0} y={0} decorated={false} /></g>
    </Art>
  ),
  // p.84: big and small gift, new and old book, plain and decorated cake.
  '84:0.173,0.259,0.166,0.065': (alt) => (
    <Art alt={alt}>
      <Gift x={100} y={80} scale={1.4} />
      <Gift x={240} y={120} scale={0.7} />
    </Art>
  ),
  '84:0.411,0.262,0.185,0.098': (alt) => (
    <Art alt={alt}>
      <Book x={60} y={46} />
      <Sparkle x={52} y={40} size={12} />
      <Sparkle x={146} y={34} size={9} />
      <Sparkle x={140} y={136} size={7} />
      <Book x={190} y={46} cover="fill-ui-muted" edge="fill-ui-muted-strong" worn />
    </Art>
  ),
  '84:0.635,0.264,0.194,0.049': (alt) => (
    <Art alt={alt}>
      <Cake x={88} y={96} decorated={false} />
      <Cake x={232} y={96} decorated />
    </Art>
  ),
  // p.96: one pencil.
  '96:0.62,0.78,0.085,0.05': (alt) => (
    <Art alt={alt} viewBox="60 30 220 124">
      <Pencil x={168} y={92} />
    </Art>
  ),
  // p.98: a thermometer at 40°C.
  '98:0.704,0.779,0.087,0.103': (alt) => (
    <Art alt={alt}>
      <rect x="136" y="18" width="34" height="132" rx="17" className="fill-ui-border" />
      <rect x="136" y="12" width="34" height="132" rx="17" className="fill-ui-surface" />
      <circle cx="153" cy="140" r="26" className="fill-brand-secondary-edge" />
      <circle cx="153" cy="136" r="26" className="fill-brand-secondary" />
      <rect x="146" y="30" width="14" height="106" rx="7" className="fill-brand-secondary" />
      {[44, 64, 84, 104].map((y) => <rect key={y} x="174" y={y} width="12" height="4" rx="2" className="fill-ui-border" />)}
      <text x="200" y="56" className={`${LABEL} text-[28px]`}>40°C</text>
    </Art>
  ),
  // p.106: fifteen faces, two cups of tea for $180, a jacket for $2,200.
  '106:0.164,0.251,0.223,0.094': (alt) => (
    <Art alt={alt} viewBox="44 20 232 140">
      {[0, 1, 2].flatMap((row) => [0, 1, 2, 3, 4].map((column) => <Face key={`${row}-${column}`} x={72 + column * 44} y={46 + row * 44} />))}
    </Art>
  ),
  '106:0.457,0.255,0.204,0.074': (alt) => (
    <Art alt={alt}>
      <Cup x={84} y={100} scale={0.9} steam={false} />
      <Cup x={184} y={100} scale={0.9} steam={false} />
      <PriceTag x={270} y={44} text="$180" />
    </Art>
  ),
  '106:0.703,0.252,0.16,0.101': (alt) => (
    <Art alt={alt}>
      <Shirt x={130} y={94} scale={1.15} jacket />
      <PriceTag x={250} y={50} text="$2,200" width={86} />
    </Art>
  ),
  // p.107: a clock a little after eleven; three pens and a flower for US$8.45.
  '107:0.251,0.297,0.14,0.107': () => (
    <div className="flex justify-center"><ClockFace time="11:10" next={false} /></div>
  ),
  '107:0.678,0.293,0.148,0.104': (alt) => (
    <Art alt={alt}>
      <Pen x={56} y={88} angle={-72} length={120} />
      <Pen x={100} y={88} angle={-72} length={120} color="fill-brand-secondary" edge="fill-brand-secondary-edge" />
      <Pen x={144} y={88} angle={-72} length={120} color="fill-brand-primary-soft-edge" />
      <Flower x={212} y={58} />
      <PriceTag x={262} y={150} text="US$8.45" width={96} />
    </Art>
  ),
  // p.118: a $100 pen and a $50 pen; a steaming cup on a saucer.
  '118:0.22,0.548,0.132,0.093': (alt) => (
    <Art alt={alt}>
      <Pen x={90} y={72} fancy color="fill-brand-primary-deep" edge="fill-ui-ink-strong" />
      <PriceTag x={90} y={140} text="$100" />
      <Pen x={232} y={72} color="fill-brand-secondary" edge="fill-brand-secondary-edge" />
      <PriceTag x={232} y={140} text="$50" />
    </Art>
  ),
  '118:0.433,0.551,0.125,0.089': (alt) => (
    <Art alt={alt}>
      <Cup x={160} y={110} scale={1.25} />
    </Art>
  ),
  // p.171: basketball on the left, tennis racket and ball on the right.
  '171:0.211,0.713,0.275,0.15': (alt) => (
    <Art alt={alt}>
      <circle cx="90" cy="96" r="52" className="fill-brand-secondary-edge" />
      <circle cx="90" cy="90" r="52" className="fill-brand-secondary" />
      <path d="M38 90h104M90 38v104M54 52q24 38 0 76M126 52q-24 38 0 76" className={`fill-none stroke-brand-secondary-edge [stroke-width:4] ${ROUND}`} />
      <g transform="rotate(-35 226 86)">
        <rect x="219" y="112" width="14" height="56" rx="7" className="fill-brand-primary-deep" />
        <ellipse cx="226" cy="70" rx="36" ry="46" className="fill-brand-primary" />
        <ellipse cx="226" cy="70" rx="27" ry="37" className="fill-brand-primary-wash" />
        <path d="M208 50h36M202 70h48M208 90h36M216 40v60M226 34v72M236 40v60" className="fill-none stroke-brand-primary-soft-edge [stroke-width:2]" />
      </g>
      <circle cx="282" cy="140" r="16" className="fill-brand-primary-edge" />
      <circle cx="282" cy="137" r="16" className="fill-brand-primary-soft-edge" />
      <path d="M270 128q10 10 0 20M294 126q-10 10 0 20" className={`fill-none stroke-ui-surface [stroke-width:2.5] ${ROUND}`} />
    </Art>
  ),
};

/** The redrawn picture for this printed crop, or null to keep the scan. */
export function objectScene(key: string, alt: string): ReactNode {
  return SCENES[key]?.(alt) ?? null;
}
