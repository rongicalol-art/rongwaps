/**
 * The streak moment's fire. Every shape is recomputed each frame from one moving spine, so the flame
 * never repeats. Drawn in its own units: base at (0, 0), y up, about 88 wide and 118 tall at full burn.
 */
export const FIRE = { W: 88, H: 118, VIEW_BOX: [-62, -136, 124, 142] as const };
/** How hard it burns under yesterday's number (1 = full). */
export const LOW_BURN = 0.22;

const TAU = Math.PI * 2;
const round1 = (value: number) => Math.round(value * 10) / 10;

export type Track = (time: number) => number;
/** `g` grows it from nothing, `e` is how hard it burns, `h` and `w` squash and stretch it. */
export interface FireTracks { g: Track; e: Track; h: Track; w: Track }

/** A value that moves through [time, value] points, easing between them; holds the last one after. */
export function track(points: Array<[number, number]>): Track {
  return (time) => {
    if (time <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (time < points[i][0]) {
        const u = (time - points[i - 1][0]) / (points[i][0] - points[i - 1][0]);
        return points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u * u * (3 - 2 * u);
      }
    }
    return points[points.length - 1][1];
  };
}
export const SETTLED_FIRE: FireTracks = { g: () => 1, e: () => 1, h: () => 1, w: () => 1 };

/** Half-width from base (0) to tip (1): a round belly that tapers to a point. */
const belly = (s: number) => Math.pow(Math.sin(Math.PI * Math.pow(s, 0.53)), 1.3);
/** The spine leans left low down, curls right at the tip, and waves travel up it, stronger toward the tip. */
const spine = (s: number, t: number, amp: number) => 0.2 * s * s * s - 0.05 * Math.sin(Math.PI * Math.min(s, 1))
  + amp * (0.115 * Math.pow(s, 1.5) * Math.sin(TAU * (1.15 * t - 0.85 * s))
    + 0.055 * Math.pow(s, 2.2) * Math.sin(TAU * (2.3 * t - 1.6 * s) + 1.3));
const breathe = (t: number, seed: number) => 1 + 0.035 * Math.sin(TAU * 1.7 * t + seed) + 0.025 * Math.sin(TAU * 2.9 * t + seed * 2.3);

function curve(points: number[][]) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i - 1] ?? points[i], b = points[i], c = points[i + 1], e = points[i + 2] ?? c;
    d += `C${round1(b[0] + (c[0] - a[0]) / 6)},${round1(b[1] + (c[1] - a[1]) / 6)} ${round1(c[0] - (e[0] - b[0]) / 6)},${round1(c[1] - (e[1] - b[1]) / 6)} ${round1(c[0])},${round1(c[1])}`;
  }
  return d;
}

interface Body { W: number; H: number; amp: number }
interface Tongue { w: number; h: number; x: number; y: number; seed: number; lag?: number; straight?: boolean }

/** One tongue of the flame, following the body's spine (or standing straight, for a loose drop). */
function tongue(o: Tongue, body: Body, time: number) {
  const STEPS = 18;
  const left: number[][] = [], right: number[][] = [];
  const t = time - (o.lag ?? 0);
  const h = o.h * breathe(t, o.seed);
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS, y = o.y + h * s;
    const centre = o.straight ? o.x : o.x + body.W * spine(y / body.H, t, body.amp);
    const half = o.w * 0.5 * belly(s);
    left.push([centre - half * (1 + body.amp * 0.1 * s * Math.sin(TAU * (1.9 * t - 1.3 * s) + o.seed * 3.1)), -y]);
    right.push([centre + half * (1 + body.amp * 0.1 * s * Math.sin(TAU * (1.6 * t - 1.1 * s) + o.seed * 4.3 + 1.7)), -y]);
  }
  return `M${round1(left[0][0])},${round1(left[0][1])}${curve(left)}${curve(right.reverse())}Z`;
}

function burn(tracks: FireTracks, time: number): Body & { g: number } {
  const g = tracks.g(time), e = tracks.e(time);
  const tall = e <= 1 ? 0.72 + 0.28 * e : 1 + 0.3 * (e - 1);
  const wide = e <= 1 ? 0.86 + 0.14 * e : 1 + 0.1 * (e - 1);
  return { g, W: FIRE.W * wide * tracks.w(time) * Math.pow(g, 0.8), H: FIRE.H * tall * tracks.h(time) * g, amp: 0.5 + 0.5 * Math.min(e, 1.4) };
}

/** The flame's three path strings (body, gold, core) at `time` on the tracks; `noise` (ms) drives the flicker. */
export function firePaths(tracks: FireTracks, time: number, noise: number): [string, string, string] {
  const body = burn(tracks, time), t = noise / 1000;
  if (body.g < 0.01) return ['', '', ''];
  return [
    tongue({ w: body.W, h: body.H, x: 0, y: 0, seed: 1 }, body, t),
    tongue({ w: body.W * 0.57, h: body.H * 0.56, x: body.W * 0.012, y: body.H * 0.035, seed: 1.6, lag: 0.07 }, body, t),
    tongue({ w: body.W * 0.29, h: body.H * 0.29, x: body.W * 0.02, y: body.H * 0.075, seed: 2.2, lag: 0.13 }, body, t),
  ];
}

/** Where the tip is, in fire units (y up). */
export function fireTip(tracks: FireTracks, time: number, noise: number) {
  const body = burn(tracks, time), t = noise / 1000;
  return { x: body.W * spine(1, t, body.amp), y: body.H * breathe(t, 1) };
}

/** A still drop of fire (the piece the flame throws, and the burst): head at the origin, tail up. */
const CALM: Body = { W: 1, H: 1, amp: 0 };
export const FIRE_DROP = {
  viewBox: '-9 -20 18 28',
  body: tongue({ w: 16, h: 26, x: 0, y: -7, seed: 0, straight: true }, CALM, 0),
  gold: tongue({ w: 9, h: 14, x: 0, y: -5, seed: 0, straight: true }, CALM, 0),
};
