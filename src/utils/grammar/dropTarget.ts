export interface DropRect {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The drop spot a dragged word is over: the one whose centre is nearest the point, within `radius`.
 * Keep the current spot in a near tie so an opening gap doesn't flicker, but let a clearly
 * nearer neighbour take over even when both spots are inside the snap radius.
 */
export function nearestDropTarget(
  point: { x: number; y: number },
  targets: DropRect[],
  radius: number,
  current: string | null = null,
): string | null {
  const distance = (rect: DropRect) => Math.hypot(point.x - (rect.left + rect.right) / 2, point.y - (rect.top + rect.bottom) / 2);
  const held = targets.find((target) => target.id === current);
  let best: DropRect | null = null;
  for (const target of targets) if (!best || distance(target) < distance(best)) best = target;
  if (held && distance(held) <= radius * 1.2 && (!best || distance(held) <= distance(best) + 8)) return held.id;
  return best && distance(best) <= radius ? best.id : null;
}
