import {
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  BOOK_MAX_ZOOM,
  BOOK_MIN_ZOOM,
  clampBookOffset,
  clampBookZoom,
  getBookStagePoint,
  getBookZoomOffset,
  type BookPoint,
  type BookViewerMetrics,
} from '../utils/bookViewerLayout';

const DOUBLE_TAP_ZOOM = 2.5;
const SWIPE_MIN_DISTANCE = 56;
const SWIPE_MAX_DURATION_MS = 600;

interface DragGesture {
  pointerId: number;
  pointerType: string;
  start: BookPoint;
  last: BookPoint;
  startedAt: number;
}

interface PinchGesture {
  startDistance: number;
  startZoom: number;
  startOffset: BookPoint;
  startMid: BookPoint;
}

function distanceBetween(first: BookPoint, second: BookPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpointBetween(first: BookPoint, second: BookPoint): BookPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

interface UseBookViewerPointerGesturesOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  zoomRef: RefObject<number>;
  offsetRef: RefObject<BookPoint>;
  metricsRef: RefObject<BookViewerMetrics>;
  commitView: (zoom: number, offset: BookPoint, immediate?: boolean) => void;
  zoomTo: (zoom: number, anchor?: BookPoint) => void;
  canPagePrevious: boolean;
  canPageNext: boolean;
  onPageChange: (delta: number) => void;
}

/**
 * One- and two-finger input for the book viewer: drag to pan, pinch to zoom,
 * double-tap to toggle, and a quick horizontal swipe at fit turns the page.
 */
export function useBookViewerPointerGestures({
  stageRef,
  zoomRef,
  offsetRef,
  metricsRef,
  commitView,
  zoomTo,
  canPagePrevious,
  canPageNext,
  onPageChange,
}: UseBookViewerPointerGesturesOptions) {
  const pointersRef = useRef(new Map<number, BookPoint>());
  const dragRef = useRef<DragGesture | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);

  const handleStageDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    zoomTo(
      zoomRef.current > BOOK_MIN_ZOOM + 0.01 ? BOOK_MIN_ZOOM : Math.min(DOUBLE_TAP_ZOOM, BOOK_MAX_ZOOM),
      getBookStagePoint(stage, event),
    );
  }, [stageRef, zoomRef, zoomTo]);

  const handleStagePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const point = getBookStagePoint(stage, event);
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, point);
    stage.setPointerCapture(event.pointerId);

    if (pointers.size === 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        start: point,
        last: point,
        startedAt: performance.now(),
      };
      return;
    }

    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      dragRef.current = null;
      pinchRef.current = {
        startDistance: Math.max(1, distanceBetween(first, second)),
        startZoom: zoomRef.current,
        startOffset: offsetRef.current,
        startMid: midpointBetween(first, second),
      };
    }
  }, [offsetRef, stageRef, zoomRef]);

  const handleStagePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const pointers = pointersRef.current;
    if (!stage || !pointers.has(event.pointerId)) return;

    const point = getBookStagePoint(stage, event);
    pointers.set(event.pointerId, point);
    const metrics = metricsRef.current;

    if (pointers.size >= 2 && pinchRef.current) {
      const pinch = pinchRef.current;
      const [first, second] = [...pointers.values()];
      const nextZoom = clampBookZoom(
        pinch.startZoom * (distanceBetween(first, second) / pinch.startDistance),
      );
      const anchored = getBookZoomOffset(
        pinch.startMid,
        pinch.startZoom,
        nextZoom,
        pinch.startOffset,
        metrics,
      );
      const mid = midpointBetween(first, second);
      commitView(nextZoom, clampBookOffset({
        x: anchored.x + mid.x - pinch.startMid.x,
        y: anchored.y + mid.y - pinch.startMid.y,
      }, nextZoom, metrics));
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (zoomRef.current <= BOOK_MIN_ZOOM + 0.01) return;

    const nextOffset = clampBookOffset({
      x: offsetRef.current.x + point.x - drag.last.x,
      y: offsetRef.current.y + point.y - drag.last.y,
    }, zoomRef.current, metrics);
    drag.last = point;
    commitView(zoomRef.current, nextOffset);
  }, [commitView, metricsRef, offsetRef, stageRef, zoomRef]);

  const handleStagePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const drag = dragRef.current;
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }

    if (pointers.size >= 2) return;

    if (pointers.size === 1) {
      const [remaining] = [...pointers.entries()];
      pinchRef.current = null;
      dragRef.current = {
        pointerId: remaining[0],
        pointerType: event.pointerType,
        start: remaining[1],
        last: remaining[1],
        startedAt: performance.now(),
      };
      return;
    }

    pinchRef.current = null;
    dragRef.current = null;

    if (
      drag?.pointerId === event.pointerId
      && drag.pointerType === 'touch'
      && zoomRef.current <= BOOK_MIN_ZOOM + 0.01
    ) {
      const endPoint = getBookStagePoint(stage, event);
      const deltaX = endPoint.x - drag.start.x;
      const deltaY = endPoint.y - drag.start.y;
      const duration = performance.now() - drag.startedAt;
      if (
        duration <= SWIPE_MAX_DURATION_MS
        && Math.abs(deltaX) >= SWIPE_MIN_DISTANCE
        && Math.abs(deltaX) > Math.abs(deltaY) * 1.5
      ) {
        if (deltaX < 0 && canPageNext) onPageChange(1);
        else if (deltaX > 0 && canPagePrevious) onPageChange(-1);
      }
    }
  }, [canPageNext, canPagePrevious, onPageChange, stageRef, zoomRef]);

  return {
    handleStageDoubleClick,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerEnd,
  };
}
