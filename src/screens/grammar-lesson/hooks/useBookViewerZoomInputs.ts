import { useEffect } from 'react';
import {
  BOOK_MIN_ZOOM,
  clampBookZoom,
  getBookStagePoint,
  getBookZoomOffset,
  getNextBookZoom,
  getPreviousBookZoom,
  type BookPoint,
} from '../utils/bookViewerLayout';
import type { BookViewerGestureContext } from './useBookViewerPointerGestures';

const WHEEL_ZOOM_SENSITIVITY = 0.0015;

interface SafariGestureEvent extends Event {
  clientX?: number;
  clientY?: number;
  scale?: number;
}

/**
 * Desktop zoom inputs for the book viewer: wheel and trackpad pinch (Safari
 * reports pinch as gesture events), plus keyboard page/zoom shortcuts.
 */
export function useBookViewerZoomInputs({
  stageRef,
  zoomRef,
  offsetRef,
  metricsRef,
  commitView,
  zoomTo,
  canPagePrevious,
  canPageNext,
  onPageChange,
}: BookViewerGestureContext) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const zoomAtAnchor = (factor: number, anchor: BookPoint) => {
      const nextZoom = clampBookZoom(zoomRef.current * factor);
      if (nextZoom === zoomRef.current) return;
      commitView(nextZoom, getBookZoomOffset(
        anchor,
        zoomRef.current,
        nextZoom,
        offsetRef.current,
        metricsRef.current,
      ));
    };

    const handleWheel = (event: WheelEvent) => {
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      if (delta === 0) return;
      event.preventDefault();
      zoomAtAnchor(Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY), getBookStagePoint(stage, event));
    };

    let previousScale = 1;
    let anchor: BookPoint = { x: 0, y: 0 };

    const handleGestureStart = (event: Event) => {
      const gesture = event as SafariGestureEvent;
      event.preventDefault();
      previousScale = 1;
      const rect = stage.getBoundingClientRect();
      // Safari zeroes the coordinates on some gestures; anchor to the center
      // instead of the stage corner.
      anchor = {
        x: typeof gesture.clientX === 'number' && gesture.clientX > 0
          ? gesture.clientX - rect.left
          : rect.width / 2,
        y: typeof gesture.clientY === 'number' && gesture.clientY > 0
          ? gesture.clientY - rect.top
          : rect.height / 2,
      };
    };

    const handleGestureChange = (event: Event) => {
      const gesture = event as SafariGestureEvent;
      event.preventDefault();
      const scale = Math.max(0.01, gesture.scale ?? 1);
      const factor = scale / previousScale;
      previousScale = scale;
      zoomAtAnchor(factor, anchor);
    };

    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      previousScale = 1;
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    stage.addEventListener('gesturestart', handleGestureStart, { passive: false });
    stage.addEventListener('gesturechange', handleGestureChange, { passive: false });
    stage.addEventListener('gestureend', handleGestureEnd, { passive: false });
    return () => {
      stage.removeEventListener('wheel', handleWheel);
      stage.removeEventListener('gesturestart', handleGestureStart);
      stage.removeEventListener('gesturechange', handleGestureChange);
      stage.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [commitView, metricsRef, offsetRef, stageRef, zoomRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'ArrowLeft' && canPagePrevious) {
        event.preventDefault();
        onPageChange(-1);
      } else if (event.key === 'ArrowRight' && canPageNext) {
        event.preventDefault();
        onPageChange(1);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomTo(getNextBookZoom(zoomRef.current));
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomTo(getPreviousBookZoom(zoomRef.current));
      } else if (event.key === '0') {
        event.preventDefault();
        zoomTo(BOOK_MIN_ZOOM);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canPageNext, canPagePrevious, onPageChange, zoomRef, zoomTo]);
}
