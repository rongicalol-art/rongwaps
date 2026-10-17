import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { nearestDropTarget, type DropRect } from '../../utils/grammar/dropTarget';

/** Where a dragged word came from: a dock tile, or a word already placed in a blank. */
export type DragSource = { kind: 'bank'; tile: number } | { kind: 'placed'; tile: number; slotId: string };

export interface DragState {
  source: DragSource;
  text: string;
  /** Size of the word being carried, so the open gap can match it. */
  width: number;
  height: number;
  x: number;
  y: number;
  over: string | null;
  /** Let go outside a spot: the word glides back to where it started. */
  returning: { x: number; y: number } | null;
}

interface UseTileDragOptions {
  disabled?: boolean;
  /** Called on release: the spot it was over, or null. */
  onDrop: (source: DragSource, slotId: string | null) => void;
}

const MOVE_THRESHOLD = 6;
/** How close (px) the carried word must be to a spot for it to open. */
const SNAP_RADIUS = 72;
const RETURN_MS = 170;

/** Every spot a word can be dropped on is a DOM node marked `data-drop-slot`. */
function dropRects(exclude?: string): DropRect[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-drop-slot]'))
    .filter((node) => node.dataset.dropSlot !== exclude)
    .map((node) => {
      const box = node.getBoundingClientRect();
      return { id: node.dataset.dropSlot ?? '', left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    });
}

/**
 * Pointer-based drag for word tiles (mouse and touch, no library). A tap that never moves
 * stays an ordinary click; once the pointer travels it carries a copy of the word, opens the
 * nearest drop spot, and reports where it was released.
 */
export function useTileDrag({ disabled, onDrop }: UseTileDragOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const suppressClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const onDropRef = useRef(onDrop);
  useEffect(() => { onDropRef.current = onDrop; });
  useEffect(() => () => cleanup.current?.(), []);

  const start = useCallback((source: DragSource, text: string, event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const node = event.currentTarget;
    const origin = node.getBoundingClientRect();
    const from = { x: event.clientX, y: event.clientY };
    let active = false;
    let over: string | null = null;
    cleanup.current?.();

    const move = (e: PointerEvent) => {
      if (!active) {
        if (Math.hypot(e.clientX - from.x, e.clientY - from.y) < MOVE_THRESHOLD) return;
        active = true;
      }
      const targets = dropRects(source.kind === 'placed' ? source.slotId : undefined);
      // The word rides above the fingertip and aims a word-height above it, so the open gap stays visible beneath the word.
      const aim = { x: e.clientX, y: e.clientY - origin.height };
      const next = nearestDropTarget(aim, targets, SNAP_RADIUS, over);
      if (next !== over && next) navigator.vibrate?.(8);
      over = next;
      setDrag({ source, text, width: origin.width, height: origin.height, x: e.clientX, y: e.clientY, over, returning: null });
    };
    const finish = (e: PointerEvent, cancelled: boolean) => {
      cleanup.current?.();
      if (!active) return;
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      if (over && !cancelled) {
        setDrag(null);
        onDropRef.current(source, over);
        return;
      }
      setDrag({ source, text, width: origin.width, height: origin.height, x: e.clientX, y: e.clientY, over: null, returning: { x: origin.left + origin.width / 2, y: origin.top + origin.height * 2 } });
      setTimeout(() => {
        setDrag(null);
        if (!cancelled) onDropRef.current(source, null);
      }, RETURN_MS);
    };
    const up = (e: PointerEvent) => finish(e, false);
    const cancel = (e: PointerEvent) => finish(e, true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      cleanup.current = null;
    };
  }, [disabled]);

  /** Spread onto the element that picks the word up. */
  const bind = useCallback((source: DragSource, text: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => start(source, text, event),
    onClickCapture: (event: { stopPropagation: () => void; preventDefault: () => void }) => {
      if (!suppressClick.current) return;
      event.stopPropagation();
      event.preventDefault();
    },
    style: { touchAction: 'none' as const },
  }), [start]);

  return { drag, bind };
}
