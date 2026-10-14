export interface MorphRect { left: number; top: number; width: number; height: number }

/** Lay out the destination once, then animate its paper on the compositor. */
export function rectMorphFrames(from: MorphRect, to: MorphRect): Array<{ transform: string }> {
  return [
    { transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / Math.max(1, to.width)},${from.height / Math.max(1, to.height)})` },
    { transform: 'none' },
  ];
}
