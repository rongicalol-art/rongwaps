import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  AppIcon,
  EmptyState,
  FloatingDock,
  IconActionButton,
  ScreenHeader,
} from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { useBookViewerHistory } from '../hooks/useBookViewerHistory';
import { useBookViewerPinchPan } from '../hooks/useBookViewerPinchPan';
import {
  BOOK_MIN_ZOOM,
  getNextBookZoom,
  getPreviousBookZoom,
  isMaximumBookZoom,
  isMinimumBookZoom,
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

/**
 * Full-bleed, full-viewport canvas window over the Grammar window's chrome.
 * The scan uses the whole viewport, so it never reserves the side-nav lane.
 */
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

  const page = pages[pageIndex] ?? 1;
  const canPagePrevious = pageIndex > 0;
  const canPageNext = pageIndex < pages.length - 1;

  const requestClose = useBookViewerHistory(onClose);
  const modalFocusProps = useModalFocus({
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    isActive: true,
    onEscape: requestClose,
    restoreFocus: false,
  });

  const changePage = useCallback((delta: number) => {
    setImageFailed(false);
    setPageIndex((index) => Math.min(pages.length - 1, Math.max(0, index + delta)));
  }, [pages.length]);

  const {
    zoom,
    pageLayout,
    naturalSize,
    setNaturalSize,
    zoomTo,
    handleStageDoubleClick,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerEnd,
  } = useBookViewerPinchPan({
    stageRef,
    page,
    canPagePrevious,
    canPageNext,
    onPageChange: changePage,
  });
  const isLoaded = naturalSize.width > 0 && naturalSize.height > 0;

  // The viewer paints its own full-viewport tone; the page beneath must not
  // scroll behind it.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Warm the neighboring scans so turning a page never waits on the network.
  const previousPage = pages[pageIndex - 1];
  const nextPage = pages[pageIndex + 1];
  useEffect(() => {
    for (const neighbor of [previousPage, nextPage]) {
      if (neighbor === undefined) continue;
      const image = new window.Image();
      image.src = bookPageImageUrl(bookId, neighbor);
    }
  }, [bookId, nextPage, previousPage]);

  const pageNav = (
    <>
      <IconActionButton
        onClick={() => changePage(-1)}
        disabled={!canPagePrevious}
        size="sm"
        icon={<AppIcon name="back" size={16} />}
        label="Previous book page"
      />
      <IconActionButton
        onClick={() => changePage(1)}
        disabled={!canPageNext}
        size="sm"
        icon={<AppIcon name="forward" size={16} />}
        label="Next book page"
      />
    </>
  );

  const windowProps = {
    ref: dialogRef,
    role: 'dialog',
    'aria-modal': true,
    'aria-label': `Book reference for ${grammarTitle}`,
    tabIndex: -1,
    className:
      'fixed inset-0 z-shell flex flex-col bg-ui-canvas pt-[env(safe-area-inset-top,0px)] outline-none',
    ...modalFocusProps,
  } as const;

  if (pages.length === 0) {
    return createPortal(
      <div {...windowProps}>
        <ScreenHeader variant="bar" title="Book reference" onClose={requestClose} />
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <EmptyState
            icon="books"
            title="No book pages"
            description="No printed pages were attached to this grammar point."
          />
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div {...windowProps}>
      <ScreenHeader
        variant="bar"
        maxWidth="none"
        eyebrow={`Lesson ${lessonId} · Book reference`}
        title={`Printed page ${page}`}
        currentIndex={pageIndex}
        totalCount={pages.length}
        onClose={requestClose}
        rightAction={pageNav}
      />

      <main
        ref={stageRef}
        className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden pb-dock-clearance select-none active:cursor-grabbing"
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerEnd}
        onPointerCancel={handleStagePointerEnd}
        onDoubleClick={handleStageDoubleClick}
      >
        {imageFailed ? (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <EmptyState
              icon="error"
              iconBg="bg-feedback-warning-surface"
              iconColor="text-feedback-warning-edge"
              title="Book page unavailable"
              description={`The reference is printed page ${page}. Export this page from the source PDF to add it here.`}
            />
          </div>
        ) : (
          <>
            {/* Sheet edge for the scan: its own layer so the hairline border
                and shadow stay 1:1 while the image transform zooms. */}
            {isLoaded && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 border border-ui-border shadow-ambient-lg"
                style={{
                  width: pageLayout.width,
                  height: pageLayout.height,
                  transform: `translate3d(${pageLayout.x}px, ${pageLayout.y}px, 0)`,
                }}
              />
            )}

            <img
              key={page}
              src={bookPageImageUrl(bookId, page)}
              alt={`Scanned source book page ${page} for ${grammarTitle}`}
              loading="eager"
              decoding="async"
              draggable={false}
              onLoad={(event) =>
                setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setImageFailed(true)}
              className={cn(
                'absolute left-0 top-0 max-w-none bg-ui-surface select-none will-change-transform',
                isLoaded ? 'opacity-100' : 'opacity-0',
              )}
              style={{
                width: isLoaded ? naturalSize.width : undefined,
                height: isLoaded ? naturalSize.height : undefined,
                transform: `translate3d(${pageLayout.x}px, ${pageLayout.y}px, 0) scale(${pageLayout.scale})`,
                transformOrigin: '0 0',
              }}
            />

            {!isLoaded && (
              <div
                role="status"
                aria-label="Loading book page"
                className="absolute inset-0 flex items-center justify-center pb-dock-clearance"
              >
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-ui-border border-t-brand-primary" />
              </div>
            )}
          </>
        )}
      </main>

      <FloatingDock.Root position="absolute">
        <FloatingDock.Pill maxWidth="sm" className="justify-between">
          <IconActionButton
            onClick={() => zoomTo(getPreviousBookZoom(zoom))}
            disabled={isMinimumBookZoom(zoom)}
            icon={<AppIcon name="minus" size={18} />}
            label="Zoom out"
          />
          <ActionButton
            variant="quiet"
            size="sm"
            onClick={() => zoomTo(BOOK_MIN_ZOOM)}
            aria-label="Reset zoom to fit"
            className="min-w-[68px] tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </ActionButton>
          <IconActionButton
            onClick={() => zoomTo(getNextBookZoom(zoom))}
            disabled={isMaximumBookZoom(zoom)}
            icon={<AppIcon name="plus" size={18} />}
            label="Zoom in"
          />
        </FloatingDock.Pill>
      </FloatingDock.Root>
    </div>,
    document.body,
  );
}
