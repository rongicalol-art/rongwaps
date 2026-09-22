import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  BOOK_MIN_ZOOM,
  clampBookOffset,
  clampBookZoom,
  getBookPageLayout,
  getBookZoomOffset,
  type BookPageLayout,
  type BookPoint,
  type BookViewerMetrics,
} from '../utils/bookViewerLayout';
import { useBookViewerPointerGestures } from './useBookViewerPointerGestures';
import { useBookViewerZoomInputs } from './useBookViewerZoomInputs';

const ZERO_OFFSET: BookPoint = { x: 0, y: 0 };
const EMPTY_SIZE = { width: 0, height: 0 };

interface UseBookViewerPinchPanOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  page: number;
  canPagePrevious: boolean;
  canPageNext: boolean;
  onPageChange: (delta: number) => void;
}

/**
 * Pan/zoom state for the book viewer. The page is never laid out by the
 * browser's scroll boxes — it is one GPU-composited transform — so gestures
 * stay smooth and the fitted layout can never flash at full resolution.
 */
export function useBookViewerPinchPan({
  stageRef,
  page,
  canPagePrevious,
  canPageNext,
  onPageChange,
}: UseBookViewerPinchPanOptions) {
  const [zoom, setZoom] = useState<number>(BOOK_MIN_ZOOM);
  const [offset, setOffset] = useState<BookPoint>(ZERO_OFFSET);
  const [stageSize, setStageSize] = useState(EMPTY_SIZE);
  const [naturalSize, setNaturalSize] = useState(EMPTY_SIZE);

  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  const frameRef = useRef<number | null>(null);

  const metrics = useMemo<BookViewerMetrics>(() => ({
    stageWidth: stageSize.width,
    stageHeight: stageSize.height,
    naturalWidth: naturalSize.width,
    naturalHeight: naturalSize.height,
  }), [naturalSize.height, naturalSize.width, stageSize.height, stageSize.width]);

  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  /** Refs move first (gesture continuity); React re-renders at most per frame. */
  const commitView = useCallback((nextZoom: number, nextOffset: BookPoint, immediate = false) => {
    zoomRef.current = nextZoom;
    offsetRef.current = nextOffset;

    if (immediate) {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setZoom(nextZoom);
      setOffset(nextOffset);
      return;
    }

    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const nextZoomValue = zoomRef.current;
      const nextOffsetValue = offsetRef.current;
      setZoom((current) => (current === nextZoomValue ? current : nextZoomValue));
      setOffset((current) => (
        current.x === nextOffsetValue.x && current.y === nextOffsetValue.y ? current : nextOffsetValue
      ));
    });
  }, []);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  // Measure the stage; rotation and window resizes re-fit through this. The
  // bottom padding reserves the floating dock's lane, so only the clear area
  // counts as the fit target.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const updateStageSize = () => {
      const styles = window.getComputedStyle(stage);
      const reserved =
        Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      setStageSize({
        width: stage.clientWidth,
        height: Math.max(0, stage.clientHeight - reserved),
      });
    };

    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);

  // New page: back to fitted, and drop the old image's natural size so the
  // viewer holds its loader until the new page is decoded.
  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    zoomRef.current = BOOK_MIN_ZOOM;
    offsetRef.current = ZERO_OFFSET;
    setZoom(BOOK_MIN_ZOOM);
    setOffset(ZERO_OFFSET);
    setNaturalSize(EMPTY_SIZE);
  }, [page]);

  // Keep an existing pan inside bounds after a resize or a new page image.
  useEffect(() => {
    if (metrics.stageWidth <= 0 || metrics.naturalWidth <= 0) return;
    const clamped = clampBookOffset(offsetRef.current, zoomRef.current, metrics);
    if (clamped.x === offsetRef.current.x && clamped.y === offsetRef.current.y) return;
    commitView(zoomRef.current, clamped, true);
  }, [commitView, metrics]);

  const zoomTo = useCallback((nextZoom: number, anchor?: BookPoint) => {
    const currentMetrics = metricsRef.current;
    const clamped = clampBookZoom(nextZoom);
    const point = anchor ?? {
      x: currentMetrics.stageWidth / 2,
      y: currentMetrics.stageHeight / 2,
    };
    const nextOffset = clamped <= BOOK_MIN_ZOOM
      ? ZERO_OFFSET
      : getBookZoomOffset(point, zoomRef.current, clamped, offsetRef.current, currentMetrics);
    commitView(clamped, nextOffset, true);
  }, [commitView]);

  const pointerGestures = useBookViewerPointerGestures({
    stageRef,
    zoomRef,
    offsetRef,
    metricsRef,
    commitView,
    zoomTo,
    canPagePrevious,
    canPageNext,
    onPageChange,
  });

  useBookViewerZoomInputs({
    stageRef,
    zoomRef,
    offsetRef,
    metricsRef,
    commitView,
    zoomTo,
    canPagePrevious,
    canPageNext,
    onPageChange,
  });

  const pageLayout = useMemo<BookPageLayout>(
    () => getBookPageLayout(zoom, offset, metrics),
    [metrics, offset, zoom],
  );

  return {
    zoom,
    pageLayout,
    naturalSize,
    setNaturalSize,
    zoomTo,
    ...pointerGestures,
  };
}
