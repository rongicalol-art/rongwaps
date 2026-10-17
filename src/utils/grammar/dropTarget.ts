export interface DropRect {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The drop spot a dragged word is over: the one whose centre is nearest the point, within `radius`.
 * The current spot is kept while the point stays near it, so a gap that opens (and shifts the
 * text) does not flicker back and forth between neighbours.
 */
export function nearestDropTarget(
  point: { x: number; y: number },
  targets: DropRect[],
  radius: number,
  current: string | null = null,
): string | null {
  const distance = (rect: DropRect) => Math.hypot(point.x - (rect.left + rect.right) / 2, point.y - (rect.top + rect.bottom) / 2);
  const held = targets.find((target) => target.id === current);
  if (held && distance(held) <= radius * 1.2) return held.id;
  let best: DropRect | null = null;
  for (const target of targets) if (!best || distance(target) < distance(best)) best = target;
  return best && distance(best) <= radius ? best.id : null;
}
