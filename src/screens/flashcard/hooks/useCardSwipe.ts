import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

const AXIS_LOCK_PX = 8;
const COMMIT_PX = 80;
const FLICK_PX = 40;
const FLICK_VELOCITY = 0.3; // px/ms
const MAX_TAP_MS = 600;
const EXIT_PX = 220;

interface UseCardSwipeOptions {
  enabled: boolean;
  /** Return false to reject the swipe (card springs back). dir: -1 = left, 1 = right. */
  onSwipe: (dir: -1 | 1) => boolean;
  onTap: (target: EventTarget | null) => void;
  onDragChange?: (dragging: boolean) => void;
}

interface Gesture {
  id: number;
  x: number;
  y: number;
  t: number;
  axis: 'x' | 'y' | null;
  dx: number;
}

/**
 * Native-scroll friendly swipe + tap. The element keeps `touch-action: pan-y`, so the
 * browser owns vertical scrolling; horizontal drags are tracked here and written straight
 * to the element's transform (no React state per frame).
 */
export function useCardSwipe(ref: RefObject<HTMLElement | null>, opts: UseCardSwipeOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const gesture = useRef<Gesture | null>(null);

  const paint = useCallback((dx: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = dx === 0 ? '' : `translate3d(${dx}px,0,0) rotate(${dx * 0.05}deg)`;
    el.style.setProperty('--rw-swipe-ok', String(Math.min(Math.max(dx, 0) / COMMIT_PX, 1) * 0.35));
    el.style.setProperty('--rw-swipe-no', String(Math.min(Math.max(-dx, 0) / COMMIT_PX, 1) * 0.35));
  }, [ref]);

  const settle = useCallback((dx: number, ms: number) => {
    const el = ref.current;
    if (el) el.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
    paint(dx);
  }, [ref, paint]);

  const reset = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.axis === 'x') {
      settle(0, 220);
      optsRef.current.onDragChange?.(false);
    }
  }, [settle]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!optsRef.current.enabled || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null, dx: 0 };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId || g.axis === 'y') return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        g.axis = 'y';
        return;
      }
      g.axis = 'x';
      e.currentTarget.setPointerCapture(e.pointerId);
      if (ref.current) ref.current.style.transition = 'none';
      optsRef.current.onDragChange?.(true);
    }
    g.dx = dx;
    paint(dx);
  }, [ref, paint]);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    const elapsed = Math.max(e.timeStamp - g.t, 1);

    if (g.axis === null) {
      if (elapsed <= MAX_TAP_MS) optsRef.current.onTap(e.target);
      return;
    }
    if (g.axis === 'y') return;

    optsRef.current.onDragChange?.(false);
    const dx = g.dx;
    const flick = Math.abs(dx) >= FLICK_PX && Math.abs(dx) / elapsed > FLICK_VELOCITY;
    if (Math.abs(dx) >= COMMIT_PX || flick) {
      const dir = dx < 0 ? -1 : 1;
      if (optsRef.current.onSwipe(dir)) {
        settle(dir * EXIT_PX, 200);
        return;
      }
    }
    settle(0, 220);
  }, [settle]);

  return {
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset },
  };
}
