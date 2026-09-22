export const BOOK_ZOOM_LEVELS = [1, 1.5, 2, 3, 4] as const;

export const BOOK_MIN_ZOOM = BOOK_ZOOM_LEVELS[0];
export const BOOK_MAX_ZOOM = BOOK_ZOOM_LEVELS.at(-1) ?? BOOK_MIN_ZOOM;

export type BookZoomLevel = typeof BOOK_ZOOM_LEVELS[number];

export interface BookPoint {
  x: number;
  y: number;
}

export interface BookViewerMetrics {
  stageWidth: number;
  stageHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  /** Breathing room kept around a fitted page. */
  gutter?: number;
}

export interface BookPageLayout extends BookPoint {
  width: number;
  height: number;
  scale: number;
}

/**
 * Page scale that fits the whole page inside the stage at zoom 1. Never
 * upscales past natural size so small scans stay crisp.
 */
export function getBookFitScale({
  stageWidth,
  stageHeight,
  naturalWidth,
  naturalHeight,
  gutter = 16,
}: BookViewerMetrics): number {
  if (stageWidth <= 0 || stageHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) return 0;

  const availableWidth = Math.max(1, stageWidth - gutter * 2);
  const availableHeight = Math.max(1, stageHeight - gutter * 2);
  return Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);
}

/** Pointer position translated into stage-local coordinates. */
export function getBookStagePoint(
  element: HTMLElement,
  event: { clientX: number; clientY: number },
): BookPoint {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

/**
 * On-screen position (stage coordinates) and size of a page at a zoom level.
 * The page stays centered and `offset` pans it from center.
 */
export function getBookPageLayout(
  zoom: number,
  offset: BookPoint,
  metrics: BookViewerMetrics,
): BookPageLayout {
  const scale = getBookFitScale(metrics) * zoom;
  const width = metrics.naturalWidth * scale;
  const height = metrics.naturalHeight * scale;
  return {
    x: (metrics.stageWidth - width) / 2 + offset.x,
    y: (metrics.stageHeight - height) / 2 + offset.y,
    width,
    height,
    scale,
  };
}

/** Maximum pan distance from center before the page edge leaves the stage. */
export function getBookPanBounds(zoom: number, metrics: BookViewerMetrics): BookPoint {
  const { width, height } = getBookPageLayout(zoom, { x: 0, y: 0 }, metrics);
  return {
    x: Math.max(0, (width - metrics.stageWidth) / 2),
    y: Math.max(0, (height - metrics.stageHeight) / 2),
  };
}

export function clampBookOffset(
  offset: BookPoint,
  zoom: number,
  metrics: BookViewerMetrics,
): BookPoint {
  const bounds = getBookPanBounds(zoom, metrics);
  return {
    x: Math.min(bounds.x, Math.max(-bounds.x, offset.x)),
    y: Math.min(bounds.y, Math.max(-bounds.y, offset.y)),
  };
}

/**
 * Offset that keeps the page point under `anchor` pinned in place while the
 * zoom changes (the math behind pinch, wheel, and double-tap zoom).
 */
export function getBookZoomOffset(
  anchor: BookPoint,
  fromZoom: number,
  toZoom: number,
  fromOffset: BookPoint,
  metrics: BookViewerMetrics,
): BookPoint {
  const from = getBookPageLayout(fromZoom, fromOffset, metrics);
  const to = getBookPageLayout(toZoom, { x: 0, y: 0 }, metrics);
  if (from.scale <= 0 || to.scale <= 0) return { x: 0, y: 0 };

  const imageX = (anchor.x - from.x) / from.scale;
  const imageY = (anchor.y - from.y) / from.scale;
  return clampBookOffset({
    x: anchor.x - imageX * to.scale - to.x,
    y: anchor.y - imageY * to.scale - to.y,
  }, toZoom, metrics);
}

export function getNextBookZoom(current: number): BookZoomLevel {
  const index = BOOK_ZOOM_LEVELS.findIndex((level) => level > current);
  if (index === -1) return BOOK_MAX_ZOOM;
  return BOOK_ZOOM_LEVELS[index];
}

export function getPreviousBookZoom(current: number): BookZoomLevel {
  const index = [...BOOK_ZOOM_LEVELS].reverse().findIndex((level) => level < current);
  if (index === -1) return BOOK_MIN_ZOOM;
  return BOOK_ZOOM_LEVELS[BOOK_ZOOM_LEVELS.length - 1 - index];
}

export function isMinimumBookZoom(zoom: number) {
  return zoom <= BOOK_MIN_ZOOM;
}

export function isMaximumBookZoom(zoom: number) {
  return zoom >= BOOK_MAX_ZOOM;
}

export function clampBookZoom(zoom: number) {
  return Math.min(BOOK_MAX_ZOOM, Math.max(BOOK_MIN_ZOOM, zoom));
}
