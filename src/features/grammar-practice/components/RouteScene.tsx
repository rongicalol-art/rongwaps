import { useReducedMotion } from 'motion/react';
import type { PracticePlace } from '../../../types/models';
import { FLAG_ICONS, ROUTE_ICONS } from './routeIcons';

const ROUTE = 'M100 112 C 206 42, 326 162, 440 92';
const DASH = 420;
const START = { x: 100, y: 112 };
const END = { x: 440, y: 92 };
const PURPOSE = { x: 500, y: 30 };

interface RouteSceneProps {
  from: PracticePlace | null;
  to: PracticePlace | null;
  /** The reason for the trip, in a small pin beside the destination. */
  purpose?: PracticePlace | null;
  showPurpose: boolean;
  /** The answer is right: the route line draws in. */
  arrived: boolean;
}

const FLAG_SCALE = 1.6;

function Pin({ place, x, y, radius = 40 }: { place: PracticePlace | null; x: number; y: number; radius?: number }) {
  // A country is just its flag with a thin border, no pin.
  if (place && FLAG_ICONS.has(place.icon)) {
    const width = 54 * FLAG_SCALE;
    const height = 36 * FLAG_SCALE;
    return (
      <g transform={`translate(${x} ${y})`}>
        <g transform={`scale(${FLAG_SCALE})`}>{ROUTE_ICONS[place.icon]}</g>
        <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8} className="fill-none stroke-ui-border [stroke-width:2.5]" />
        <text y={height / 2 + 30} textAnchor="middle" className="fill-ui-muted-strong font-sans text-[22px] font-extrabold sm:text-[17px]">{place.label}</text>
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={radius} cy={5} className="fill-ui-border" />
      <circle r={radius} className={place ? 'fill-ui-surface stroke-ui-border [stroke-width:3]' : 'fill-ui-surface stroke-ui-border [stroke-dasharray:6_7] [stroke-width:3]'} />
      {place && <g transform={`scale(${radius / 34})`}>{ROUTE_ICONS[place.icon]}</g>}
      {place?.label && radius > 30 && (
        <text y={radius + 28} textAnchor="middle" className="fill-ui-muted-strong font-sans text-[22px] font-extrabold sm:text-[17px]">
          {place.label}
        </text>
      )}
    </g>
  );
}

/** The book's "describe the picture": start pin → route → destination pin. */
export function RouteScene({ from, to, purpose, showPurpose, arrived }: RouteSceneProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="rounded-feature border-2 border-ui-divider bg-ui-surface">
      <svg viewBox="0 0 540 214" role="img" aria-label={`From ${from?.label ?? '?'} to ${to?.label ?? '?'}`} className="block h-auto w-full">
        <path d={ROUTE} className="fill-none stroke-ui-border [stroke-dasharray:1_12] [stroke-linecap:round] [stroke-width:4]" />
        <path
          d={ROUTE}
          style={{
            strokeDasharray: DASH,
            strokeDashoffset: arrived ? 0 : DASH,
            transition: reduceMotion ? undefined : 'stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="fill-none stroke-brand-primary [stroke-linecap:round] [stroke-width:5]"
        />
        <Pin place={from} {...START} />
        <Pin place={to} {...END} />
        {showPurpose && (
          <>
            <path d={`M${END.x + 30} ${END.y - 30} L${PURPOSE.x - 16} ${PURPOSE.y + 18}`} className="fill-none stroke-ui-border [stroke-linecap:round] [stroke-width:3]" />
            <Pin place={purpose ?? null} x={PURPOSE.x} y={PURPOSE.y} radius={24} />
          </>
        )}
      </svg>
    </div>
  );
}
