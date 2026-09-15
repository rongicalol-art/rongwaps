import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  BOOK_ZOOM_LEVELS,
  clampBookZoom,
  getFittedPageSize,
  getNextBookZoom,
  getPreviousBookZoom,
  isMaximumBookZoom,
  isMinimumBookZoom,
  type BookPageSize,
} from '../utils/bookViewerLayout';

const VIEWER_GUTTER = 24;

interface TouchPoint {
  x: number;
  y: number;
}

interface PinchGesture {
  initialDistance: number;
  initialZoom: number;
}

interface SafariGestureEvent extends Event {
  clientX?: number;
  clientY?: number;
  scale?: number;
}

function distanceBetween(first: TouchPoint, second: TouchPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpointBetween(first: TouchPoint, second: TouchPoint): TouchPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

interface UseBookViewerPinchPanOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  page: number;
  canPagePrevious: boolean;
  canPageNext: boolean;
  onPageChange: (delta: number) => void;
  revealControls: () => void;
}

export function useBookViewerPinchPan({
  stageRef,
  page,
  canPagePrevious,
  canPageNext,
  onPageChange,
  revealControls,
}: UseBookViewerPinchPanOptions) {
  const [zoom, setZoom] = useState<number>(BOOK_ZOOM_LEVELS[0]);
  const [naturalSize, setNaturalSize] = useState<BookPageSize>({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState<BookPageSize>({ width: 0, height: 0 });
  const [fitSize, setFitSize] = useState<BookPageSize>({ width: 0, height: 0 });

  const zoomRef = useRef(zoom);
  const renderedZoomRef = useRef(zoom);
  const pendingZoomRef = useRef<number | null>(null);
  const pendingZoomAnchorRef = useRef<TouchPoint | null>(null);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);
  const zoomFrameRef = useRef<number | null>(null);
  const touchPointsRef = useRef(new Map<number, TouchPoint>());
  const lastSingleTouchRef = useRef<TouchPoint | null>(null);
  const pinchGestureRef = useRef<PinchGesture | null>(null);
  const mousePanRef = useRef<{ pointerId: number; lastPoint: TouchPoint } | null>(null);
  const safariGestureRef = useRef<{ anchor: TouchPoint; initialZoom: number } | null>(null);

  // ResizeObserver for stage container
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const updateStageSize = () => {
      const styles = window.getComputedStyle(stage);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      setStageSize({
        width: Math.max(0, stage.clientWidth - horizontalPadding),
        height: Math.max(0, stage.clientHeight - verticalPadding),
      });
    };

    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);

  // Compute fit size whenever natural image size or stage dimensions change
  useEffect(() => {
    if (naturalSize.width <= 0 || naturalSize.height <= 0) return;
    setFitSize(getFittedPageSize({
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      naturalWidth: naturalSize.width,
      naturalHeight: naturalSize.height,
      gutter: VIEWER_GUTTER,
    }));
  }, [naturalSize, stageSize]);

  // Reset viewport state upon page transition
  useEffect(() => {
    setNaturalSize({ width: 0, height: 0 });
    setFitSize({ width: 0, height: 0 });
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
    zoomFrameRef.current = null;
    pendingZoomRef.current = null;
    pendingZoomAnchorRef.current = null;
    pendingScrollRef.current = null;
    zoomRef.current = BOOK_ZOOM_LEVELS[0];
    renderedZoomRef.current = BOOK_ZOOM_LEVELS[0];
    setZoom(BOOK_ZOOM_LEVELS[0]);
    stageRef.current?.scrollTo({ top: 0, left: 0 });
  }, [page, stageRef]);

  const centerStageOnZoom = useCallback((nextZoom: number) => {
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
    zoomFrameRef.current = null;
    pendingZoomRef.current = null;
    pendingZoomAnchorRef.current = null;
    pendingScrollRef.current = null;
    zoomRef.current = nextZoom;
    renderedZoomRef.current = nextZoom;
    setZoom(nextZoom);
    window.requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (!stage) return;
      if (isMinimumBookZoom(nextZoom)) {
        stage.scrollTo({ top: 0, left: 0 });
        return;
      }
      stage.scrollTo({
        top: Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2),
        left: Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2),
      });
    });
  }, [stageRef]);

  const zoomStageAtPoint = useCallback((nextZoom: number, point: TouchPoint) => {
    if (nextZoom === zoomRef.current && pendingZoomRef.current === null) return;

    zoomRef.current = nextZoom;
    pendingZoomRef.current = nextZoom;
    pendingZoomAnchorRef.current = point;
    if (zoomFrameRef.current !== null) return;

    zoomFrameRef.current = window.requestAnimationFrame(() => {
      zoomFrameRef.current = null;
      const stage = stageRef.current;
      const targetZoom = pendingZoomRef.current;
      const anchor = pendingZoomAnchorRef.current;
      pendingZoomRef.current = null;
      pendingZoomAnchorRef.current = null;
      if (!stage || targetZoom === null) return;

      const currentZoom = renderedZoomRef.current;
      const scale = targetZoom / currentZoom;
      const initialScrollLeft = stage.scrollLeft;
      const initialScrollTop = stage.scrollTop;
      const stageRect = stage.getBoundingClientRect();
      const anchorX = anchor ? anchor.x - stageRect.left : stage.clientWidth / 2;
      const anchorY = anchor ? anchor.y - stageRect.top : stage.clientHeight / 2;

      renderedZoomRef.current = targetZoom;
      pendingScrollRef.current = isMinimumBookZoom(targetZoom)
        ? { left: 0, top: 0 }
        : {
          left: Math.max(0, (initialScrollLeft + anchorX) * scale - anchorX),
          top: Math.max(0, (initialScrollTop + anchorY) * scale - anchorY),
        };
      setZoom(targetZoom);
    });
  }, [stageRef]);

  useLayoutEffect(() => {
    const pendingScroll = pendingScrollRef.current;
    const stage = stageRef.current;
    if (!pendingScroll || !stage) return;
    pendingScrollRef.current = null;
    stage.scrollLeft = pendingScroll.left;
    stage.scrollTop = pendingScroll.top;
  }, [stageRef, zoom]);

  useEffect(() => () => {
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
  }, []);

  // Safari gesture events for pinch zoom
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const getGestureAnchor = (event: SafariGestureEvent): TouchPoint => {
      const rect = stage.getBoundingClientRect();
      return {
        x: event.clientX && event.clientX > 0 ? event.clientX : rect.left + rect.width / 2,
        y: event.clientY && event.clientY > 0 ? event.clientY : rect.top + rect.height / 2,
      };
    };

    const handleGestureStart = (event: Event) => {
      const gesture = event as SafariGestureEvent;
      event.preventDefault();
      safariGestureRef.current = {
        anchor: getGestureAnchor(gesture),
        initialZoom: zoomRef.current,
      };
    };

    const handleGestureChange = (event: Event) => {
      const gesture = event as SafariGestureEvent;
      const activeGesture = safariGestureRef.current;
      if (!activeGesture) return;
      event.preventDefault();
      zoomStageAtPoint(
        clampBookZoom(activeGesture.initialZoom * Math.max(0.01, gesture.scale ?? 1)),
        activeGesture.anchor,
      );
    };

    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      safariGestureRef.current = null;
    };

    stage.addEventListener('gesturestart', handleGestureStart, { passive: false });
    stage.addEventListener('gesturechange', handleGestureChange, { passive: false });
    stage.addEventListener('gestureend', handleGestureEnd, { passive: false });
    return () => {
      stage.removeEventListener('gesturestart', handleGestureStart);
      stage.removeEventListener('gesturechange', handleGestureChange);
      stage.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [stageRef, zoomStageAtPoint]);

  // Pointer drag & pinch handlers
  const handleStagePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };

    if (event.pointerType === 'mouse') {
      if (event.button !== 0) return;
      mousePanRef.current = { pointerId: event.pointerId, lastPoint: point };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (event.pointerType !== 'touch') return;

    const touchPoints = touchPointsRef.current;
    touchPoints.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (touchPoints.size === 1) {
      lastSingleTouchRef.current = point;
      pinchGestureRef.current = null;
      return;
    }

    if (touchPoints.size !== 2) return;

    const [first, second] = [...touchPoints.values()];
    pinchGestureRef.current = {
      initialDistance: Math.max(1, distanceBetween(first, second)),
      initialZoom: zoomRef.current,
    };
    lastSingleTouchRef.current = null;
    event.preventDefault();
  }, []);

  const handleStagePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      const pan = mousePanRef.current;
      const stage = stageRef.current;
      if (!pan || pan.pointerId !== event.pointerId || !stage) return;

      stage.scrollLeft -= event.clientX - pan.lastPoint.x;
      stage.scrollTop -= event.clientY - pan.lastPoint.y;
      pan.lastPoint = { x: event.clientX, y: event.clientY };
      event.preventDefault();
      return;
    }

    if (event.pointerType !== 'touch') return;

    const touchPoints = touchPointsRef.current;
    if (!touchPoints.has(event.pointerId)) return;
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const stage = stageRef.current;
    if (!stage) return;

    if (touchPoints.size >= 2 && pinchGestureRef.current) {
      const [first, second] = [...touchPoints.values()];
      const gesture = pinchGestureRef.current;
      const nextZoom = clampBookZoom(
        gesture.initialZoom * distanceBetween(first, second) / gesture.initialDistance,
      );
      const center = midpointBetween(first, second);

      event.preventDefault();
      zoomStageAtPoint(nextZoom, center);
      return;
    }

    const previousPoint = lastSingleTouchRef.current;
    if (!previousPoint || touchPoints.size !== 1) return;

    event.preventDefault();
    stage.scrollLeft -= event.clientX - previousPoint.x;
    stage.scrollTop -= event.clientY - previousPoint.y;
    lastSingleTouchRef.current = { x: event.clientX, y: event.clientY };
  }, [stageRef, zoomStageAtPoint]);

  const handleStagePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      if (mousePanRef.current?.pointerId !== event.pointerId) return;
      mousePanRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    if (event.pointerType !== 'touch') return;

    const touchPoints = touchPointsRef.current;
    touchPoints.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pinchGestureRef.current = null;
    const remainingPoint = touchPoints.values().next().value as TouchPoint | undefined;
    lastSingleTouchRef.current = remainingPoint ?? null;
  }, []);

  // Trackpad pinch-to-zoom (ctrl + wheel)
  useEffect(() => {
    const handleTrackpadWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      const stage = stageRef.current;
      if (!stage) return;

      event.preventDefault();
      event.stopPropagation();

      const stageRect = stage.getBoundingClientRect();
      const eventTarget = event.target;
      const isOverStage = eventTarget instanceof Node && stage.contains(eventTarget);
      const point = isOverStage
        ? { x: event.clientX, y: event.clientY }
        : { x: stageRect.left + stageRect.width / 2, y: stageRect.top + stageRect.height / 2 };
      const nextZoom = clampBookZoom(zoomRef.current * Math.exp(-event.deltaY * 0.01));
      zoomStageAtPoint(nextZoom, point);
    };

    window.addEventListener('wheel', handleTrackpadWheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', handleTrackpadWheel, { capture: true });
  }, [stageRef, zoomStageAtPoint]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      revealControls();

      if (event.key === 'ArrowLeft' && canPagePrevious) {
        event.preventDefault();
        onPageChange(-1);
      } else if (event.key === 'ArrowRight' && canPageNext) {
        event.preventDefault();
        onPageChange(1);
      } else if ((event.key === '+' || event.key === '=') && !isMaximumBookZoom(zoom)) {
        event.preventDefault();
        centerStageOnZoom(getNextBookZoom(zoom));
      } else if ((event.key === '-' || event.key === '_') && !isMinimumBookZoom(zoom)) {
        event.preventDefault();
        centerStageOnZoom(getPreviousBookZoom(zoom));
      } else if (event.key === '0' && !isMinimumBookZoom(zoom)) {
        event.preventDefault();
        centerStageOnZoom(BOOK_ZOOM_LEVELS[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canPageNext, canPagePrevious, centerStageOnZoom, onPageChange, revealControls, zoom]);

  const pageWidth = Math.max(0, Math.round(fitSize.width * zoom));
  const pageHeight = Math.max(0, Math.round(fitSize.height * zoom));
  const panMargin = zoom > BOOK_ZOOM_LEVELS[0]
    ? Math.max(VIEWER_GUTTER * 2, Math.round(Math.min(stageSize.width, stageSize.height) * 0.2))
    : VIEWER_GUTTER;
  const canvasWidth = Math.max(
    stageSize.width,
    pageWidth + panMargin * 2,
    stageSize.width + (zoom > 1 ? panMargin * 2 : 0),
  );
  const canvasHeight = Math.max(
    stageSize.height,
    pageHeight + panMargin * 2,
    stageSize.height + (zoom > 1 ? panMargin * 2 : 0),
  );

  return {
    zoom,
    naturalSize,
    setNaturalSize,
    fitSize,
    pageWidth,
    pageHeight,
    canvasWidth,
    canvasHeight,
    centerStageOnZoom,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerEnd,
  };
}
