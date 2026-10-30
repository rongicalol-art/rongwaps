import type { CSSProperties, PointerEvent } from 'react';
import { useReducedMotion } from 'motion/react';

/** The surface leans toward the pointer with a little depth, like a magnet pulling it. */
export const MAGNET_STYLE: CSSProperties = {
  transform: 'translate(calc(var(--mx, 0) * 10px), calc(var(--my, 0) * 10px)) rotateX(calc(var(--my, 0) * -6deg)) rotateY(calc(var(--mx, 0) * 6deg))',
};

/** Pointer handlers for the element that owns `--mx` / `--my` (-1…1 from its centre); mouse only. */
export function useMagnet() {
  const reduceMotion = useReducedMotion();
  return {
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (reduceMotion || event.pointerType !== 'mouse') return;
      const box = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--mx', String(((event.clientX - box.left) / box.width - 0.5) * 2));
      event.currentTarget.style.setProperty('--my', String(((event.clientY - box.top) / box.height - 0.5) * 2));
    },
    onPointerLeave(event: PointerEvent<HTMLElement>) {
      event.currentTarget.style.setProperty('--mx', '0');
      event.currentTarget.style.setProperty('--my', '0');
    },
  };
}
