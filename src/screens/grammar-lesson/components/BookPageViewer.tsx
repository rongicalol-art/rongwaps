import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { cn } from '../../../utils/cn';
import { useBookViewerHistory } from '../hooks/useBookViewerHistory';
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

interface BookPageViewerProps {
  bookId: number;
  lessonId: number;
  grammarTitle: string;
  pages: number[];
  onClose: () => void;
}

function bookPageImageUrl(bookId: number, page: number) {
  return `/data/book-pages/modern-chinese-${bookId}/page-${String(page).padStart(3, '0')}.webp`;
}

const VIEWER_GUTTER = 24;
const CONTROLS_HIDE_DELAY = 2200;
const CONTROLS_EDGE_SIZE = 72;

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

export function BookPageViewer({
  bookId,
  lessonId,
  grammarTitle,
  pages,
  onClose,
}: BookPageViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
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
  const controlsHideTimerRef = useRef<number | null>(null);
  const controlsHoverRef = useRef(false);
  const controlsFocusRef = useRef(false);
  const safariGestureRef = useRef<{ anchor: TouchPoint; initialZoom: number } | null>(null);
  const page = pages[pageIndex];

  const requestClose = useBookViewerHistory(onClose);
  const modalFocusProps = useModalFocus({
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    isActive: true,
    onEscape: requestClose,
    restoreFocus: false,
  });

  const cancelControlsHide = useCallback(() => {
    if (controlsHideTimerRef.current === null) return;
    window.clearTimeout(controlsHideTimerRef.current);
    controlsHideTimerRef.current = null;
  }, []);

  const hideControls = useCallback(() => {
    controlsHideTimerRef.current = null;
    if (controlsHoverRef.current || controlsFocusRef.current) return;
    setControlsVisible(false);
  }, []);

  const scheduleControlsHide = useCallback(() => {
    cancelControlsHide();
    controlsHideTimerRef.current = window.setTimeout(hideControls, CONTROLS_HIDE_DELAY);
  }, [cancelControlsHide, hideControls]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const handleControlsPointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') controlsHoverRef.current = true;
    revealControls();
  }, [revealControls]);

  const handleControlsPointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    controlsHoverRef.current = false;
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  useEffect(() => {
    scheduleControlsHide();
    return cancelControlsHide;
  }, [cancelControlsHide, scheduleControlsHide]);

  useEffect(() => {
    const revealFromEdge = (event: PointerEvent) => {
      const isNearTop = event.clientY <= CONTROLS_EDGE_SIZE;
      const isNearBottom = event.clientY >= window.innerHeight - CONTROLS_EDGE_SIZE;
      if (isNearTop || isNearBottom) revealControls();
    };

    window.addEventListener('pointermove', revealFromEdge, { passive: true });
    window.addEventListener('pointerdown', revealFromEdge, { passive: true });
    return () => {
      window.removeEventListener('pointermove', revealFromEdge);
      window.removeEventListener('pointerdown', revealFromEdge);
    };
  }, [revealControls]);

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
  }, []);

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

  useEffect(() => {
    setImageFailed(false);
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
  }, [page]);

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
  }, []);

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
  }, []);

  useLayoutEffect(() => {
    const pendingScroll = pendingScrollRef.current;
    const stage = stageRef.current;
    if (!pendingScroll || !stage) return;
    pendingScrollRef.current = null;
    stage.scrollLeft = pendingScroll.left;
    stage.scrollTop = pendingScroll.top;
  }, [zoom]);

  useEffect(() => () => {
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
  }, []);

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
  }, [zoomStageAtPoint]);

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
  }, [zoomStageAtPoint]);

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
  }, [zoomStageAtPoint]);

  const changePage = useCallback((delta: number) => {
    setPageIndex((index) => Math.min(pages.length - 1, Math.max(0, index + delta)));
  }, [pages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      revealControls();

      if (event.key === 'ArrowLeft' && pageIndex > 0) {
        event.preventDefault();
        changePage(-1);
      } else if (event.key === 'ArrowRight' && pageIndex < pages.length - 1) {
        event.preventDefault();
        changePage(1);
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
  }, [changePage, centerStageOnZoom, pageIndex, pages.length, revealControls, zoom]);

  const pageWidth = Math.max(0, Math.round(fitSize.width * zoom));
  const pageHeight = Math.max(0, Math.round(fitSize.height * zoom));
  // Keep a centered pan margin once the page is zoomed, even when one page
  // dimension is still smaller than the viewport. This makes mouse dragging
  // feel free in both axes instead of becoming vertical-only at 125–200%.
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
  const darkControlClass = 'border-ui-surface/20 bg-ui-ink-strong/85 text-ui-surface hover:bg-ui-ink-strong hover:text-ui-surface active:bg-ui-ink-strong/95 disabled:border-ui-surface/15 disabled:bg-ui-ink-strong/50 disabled:text-ui-surface/35';
  const controlVisibilityClass = controlsVisible
    ? 'pointer-events-auto opacity-100'
    : 'pointer-events-none opacity-0';

  if (pages.length === 0) {
    return createPortal(
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Book reference for ${grammarTitle}`}
        tabIndex={-1}
        className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-ui-ink-strong p-6 text-center text-ui-surface outline-none"
        {...modalFocusProps}
      >
        <IconActionButton
          onClick={requestClose}
          variant="surface"
          icon={<AppIcon name="close" size={20} />}
          label="Close book reference"
          className="absolute left-4 top-4 border-ui-surface/20 bg-ui-ink-strong/80 text-ui-surface hover:bg-ui-ink-strong hover:text-ui-surface"
        />
        <p className="text-lg font-black">Book page unavailable</p>
        <p className="mt-2 max-w-md text-sm font-bold text-ui-surface/70">No printed pages were attached to this grammar point.</p>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Book reference for ${grammarTitle}`}
      tabIndex={-1}
      className="fixed inset-0 z-[600] flex flex-col overflow-hidden bg-ui-ink-strong outline-none"
      {...modalFocusProps}
    >
      <header
        className={cn(
          'absolute inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top,0px)] transition-opacity duration-200',
          controlVisibilityClass,
        )}
        onPointerEnter={handleControlsPointerEnter}
        onPointerLeave={handleControlsPointerLeave}
        onFocusCapture={() => {
          controlsFocusRef.current = true;
          revealControls();
        }}
        onBlurCapture={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          controlsFocusRef.current = false;
          scheduleControlsHide();
        }}
      >
        <div className="flex items-center gap-3 border-b border-ui-surface/10 bg-ui-ink-strong/90 px-3 py-2 backdrop-blur-sm sm:px-5">
          <IconActionButton
            onClick={requestClose}
            variant="surface"
            icon={<AppIcon name="close" size={20} />}
            label="Close book reference"
            className={darkControlClass}
          />
          <p className="min-w-0 flex-1 truncate text-center text-sm font-black text-ui-surface">
            Printed page {page}
            <span className="ml-2 hidden font-bold text-ui-surface/65 sm:inline">Lesson {lessonId} · Book reference</span>
          </p>
          <div className="flex min-w-[104px] shrink-0 items-center justify-end gap-1">
            {pageIndex > 0 && (
              <IconActionButton
                onClick={() => changePage(-1)}
                variant="surface"
                icon={<AppIcon name="back" size={17} />}
                label="Previous book page"
                className={darkControlClass}
              />
            )}
            <span aria-live="polite" className="min-w-10 text-center text-xs font-black tabular-nums text-ui-surface">
              {pageIndex + 1}/{pages.length}
            </span>
            {pageIndex < pages.length - 1 && (
              <IconActionButton
                onClick={() => changePage(1)}
                variant="surface"
                icon={<AppIcon name="forward" size={17} />}
                label="Next book page"
                className={darkControlClass}
              />
            )}
          </div>
        </div>
      </header>

      <main
        ref={stageRef}
        className="min-h-0 flex-1 cursor-grab touch-none select-none overflow-auto overscroll-contain bg-ui-ink-strong active:cursor-grabbing px-3 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20"
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerEnd}
        onPointerCancel={handleStagePointerEnd}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          {imageFailed ? (
            <div className="max-w-md px-6 text-center text-ui-surface">
              <p className="text-lg font-black">Book page unavailable</p>
              <p className="mt-2 text-sm font-bold leading-6 text-ui-surface/65">
                The reference is printed page {page}. Export this page from the source PDF to add it here.
              </p>
            </div>
          ) : (
            <div
              className="shrink-0 overflow-clip bg-ui-surface"
              style={{ width: pageWidth || undefined, height: pageHeight || undefined }}
            >
              <img
                key={page}
                src={bookPageImageUrl(bookId, page)}
                alt={`Scanned source book page ${page} for ${grammarTitle}`}
                width={naturalSize.width || undefined}
                height={naturalSize.height || undefined}
                loading="eager"
                draggable={false}
                className="block h-full w-full select-none"
                onLoad={(event) => setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                onError={() => setImageFailed(true)}
              />
            </div>
          )}
        </div>
      </main>

      <footer
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom,0px)] transition-opacity duration-200',
          controlVisibilityClass,
        )}
        onPointerEnter={handleControlsPointerEnter}
        onPointerLeave={handleControlsPointerLeave}
        onFocusCapture={() => {
          controlsFocusRef.current = true;
          revealControls();
        }}
        onBlurCapture={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          controlsFocusRef.current = false;
          scheduleControlsHide();
        }}
      >
        <div className="flex items-center justify-center gap-2 border-t border-ui-surface/10 bg-ui-ink-strong/90 px-4 py-2 backdrop-blur-sm sm:py-3">
          <IconActionButton
            onClick={() => centerStageOnZoom(getPreviousBookZoom(zoom))}
            disabled={isMinimumBookZoom(zoom)}
            variant="surface"
            icon={<AppIcon name="minus" size={18} />}
            label="Zoom out"
            className={darkControlClass}
          />
          <IconActionButton
            onClick={() => centerStageOnZoom(BOOK_ZOOM_LEVELS[0])}
            variant="surface"
            icon={<span className="text-xs font-black">{Math.round(zoom * 100)}%</span>}
            label="Reset zoom to 100%"
            className={cn('w-auto px-3', darkControlClass)}
          />
          <IconActionButton
            onClick={() => centerStageOnZoom(getNextBookZoom(zoom))}
            disabled={isMaximumBookZoom(zoom)}
            variant="surface"
            icon={<AppIcon name="plus" size={18} />}
            label="Zoom in"
            className={darkControlClass}
          />
        </div>
      </footer>
    </div>,
    document.body,
  );
}
