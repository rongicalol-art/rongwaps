export const BOOK_ZOOM_LEVELS = [1, 1.25, 1.5, 2, 3, 4] as const;

export const BOOK_MIN_ZOOM = BOOK_ZOOM_LEVELS[0];
export const BOOK_MAX_ZOOM = BOOK_ZOOM_LEVELS.at(-1) ?? BOOK_MIN_ZOOM;

export type BookZoomLevel = typeof BOOK_ZOOM_LEVELS[number];

export interface BookPageSize {
  width: number;
  height: number;
}

export interface FitPageSizeOptions {
  stageWidth: number;
  stageHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  gutter?: number;
}

export function getFittedPageSize({
  stageWidth,
  stageHeight,
  naturalWidth,
  naturalHeight,
  gutter = 24,
}: FitPageSizeOptions): BookPageSize {
  if (naturalWidth <= 0 || naturalHeight <= 0) return { width: 0, height: 0 };

  const availableWidth = Math.max(1, stageWidth - gutter * 2);
  const availableHeight = Math.max(1, stageHeight - gutter * 2);
  const fitScale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);

  return {
    width: Math.max(1, Math.round(naturalWidth * fitScale)),
    height: Math.max(1, Math.round(naturalHeight * fitScale)),
  };
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
