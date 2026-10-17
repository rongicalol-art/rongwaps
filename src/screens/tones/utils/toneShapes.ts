import type { PinyinTone } from '../../../utils/pinyin/pinyinTones';

/** A point in a pad's 100×100 drawing box (y grows downwards). */
export type TonePoint = readonly [number, number];

/** Every contour is resampled to this many points so a drawn line can morph into the real one. */
export const CONTOUR_POINTS = 40;

/** Pitch level 1 (low) to 5 (high), Chao's scale, mapped onto the drawing box. */
export const levelToY = (level: number) => 86 - (level - 1) * 18;
export const yToLevel = (y: number) => (86 - y) / 18 + 1;

/** The guide lines a pad draws: high, mid, low. */
export const GUIDE_LEVELS = [5, 3, 1] as const;

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

/** Where the neutral tone's dot sits. */
const NEUTRAL_LEVEL = 2.6;

/**
 * The real shape of a tone: 1 = 55 flat high, 2 = 35 rising, 3 = 214 dipping, 4 = 51 falling,
 * 5 (neutral) = a dot (every point in one place).
 */
export function toneContour(tone: PinyinTone): TonePoint[] {
  return Array.from({ length: CONTOUR_POINTS }, (_, i): TonePoint => {
    const t = i / (CONTOUR_POINTS - 1);
    if (tone === 5) return [50, levelToY(NEUTRAL_LEVEL)];
    const level = tone === 1 ? 5
      : tone === 2 ? 3 + 2 * ease(t)
        : tone === 4 ? 5 - 4 * ease(t)
          : t < 0.38 ? 2 - ease(t / 0.38) : 1 + 3 * ease((t - 0.38) / 0.62);
    return [16 + t * 68, levelToY(level)];
  });
}

export function pathLength(points: readonly TonePoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return length;
}

/** Evenly spaced points along a drawn line, in drawing order. */
export function resampleStroke(points: readonly TonePoint[]): TonePoint[] {
  if (points.length < 2) return Array.from({ length: CONTOUR_POINTS }, () => points[0] ?? [50, 50]);
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = distances[distances.length - 1] || 1;
  const out: TonePoint[] = [];
  let j = 0;
  for (let i = 0; i < CONTOUR_POINTS; i++) {
    const at = (i / (CONTOUR_POINTS - 1)) * total;
    while (j < distances.length - 2 && distances[j + 1] < at) j++;
    const span = distances[j + 1] - distances[j] || 1;
    const f = (at - distances[j]) / span;
    out.push([points[j][0] + (points[j + 1][0] - points[j][0]) * f, points[j][1] + (points[j + 1][1] - points[j][1]) * f]);
  }
  return out;
}

/** Shorter than this (in box units) counts as a tap: the neutral tone. */
const TAP_LENGTH = 12;

/** Reads a drawn line as a tone by how the pitch moves from start to end. */
export function classifyStroke(points: readonly TonePoint[]): PinyinTone {
  if (pathLength(points) < TAP_LENGTH) return 5;
  const levels = resampleStroke(points).map(([, y]) => yToLevel(y));
  const edge = Math.max(2, Math.round(CONTOUR_POINTS * 0.15));
  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const start = average(levels.slice(0, edge));
  const end = average(levels.slice(-edge));
  const lowest = Math.min(...levels);
  if (lowest < start - 0.6 && lowest < end - 0.6) return 3;
  if (end - start > 0.9) return 2;
  if (start - end > 0.9) return 4;
  // A flat line: high is the first tone, low is a half third tone.
  return average(levels) >= 2.9 ? 1 : 3;
}

/** SVG path data; a single point gets a tiny segment so its round cap draws a dot. */
export function contourPath(points: readonly TonePoint[]): string {
  if (points.length === 0) return '';
  if (pathLength(points) < 0.5) return `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} l0.01 0`;
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

export function lerpContour(from: readonly TonePoint[], to: readonly TonePoint[], t: number): TonePoint[] {
  return from.map(([x, y], i): TonePoint => [x + (to[i][0] - x) * t, y + (to[i][1] - y) * t]);
}
