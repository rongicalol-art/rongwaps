import {
  useCallback,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { useBookViewerHistory } from '../hooks/useBookViewerHistory';
import { useBookViewerControls } from '../hooks/useBookViewerControls';
import { useBookViewerPinchPan } from '../hooks/useBookViewerPinchPan';
import { BookViewerHeader } from './book-viewer/BookViewerHeader';
import { BookViewerFooter } from './book-viewer/BookViewerFooter';

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

  const {
    controlVisibilityClass,
    revealControls,
    handleControlsPointerEnter,
    handleControlsPointerLeave,
    handleControlsFocus,
    handleControlsBlur,
  } = useBookViewerControls();

  const changePage = useCallback((delta: number) => {
    setImageFailed(false);
    setPageIndex((index) => Math.min(pages.length - 1, Math.max(0, index + delta)));
  }, [pages.length]);

  const {
    zoom,
    naturalSize,
    setNaturalSize,
    pageWidth,
    pageHeight,
    canvasWidth,
    canvasHeight,
    centerStageOnZoom,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerEnd,
  } = useBookViewerPinchPan({
    stageRef,
    page,
    canPagePrevious,
    canPageNext,
    onPageChange: changePage,
    revealControls,
  });

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
        <p className="mt-2 max-w-md text-sm font-bold text-ui-surface/70">
          No printed pages were attached to this grammar point.
        </p>
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
      <BookViewerHeader
        page={page}
        lessonId={lessonId}
        pageIndex={pageIndex}
        totalPages={pages.length}
        controlVisibilityClass={controlVisibilityClass}
        onClose={requestClose}
        onPageChange={changePage}
        onPointerEnter={handleControlsPointerEnter}
        onPointerLeave={handleControlsPointerLeave}
        onFocus={handleControlsFocus}
        onBlur={handleControlsBlur}
      />

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
                onLoad={(event) =>
                  setNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
                onError={() => setImageFailed(true)}
              />
            </div>
          )}
        </div>
      </main>

      <BookViewerFooter
        zoom={zoom}
        controlVisibilityClass={controlVisibilityClass}
        onZoomChange={centerStageOnZoom}
        onPointerEnter={handleControlsPointerEnter}
        onPointerLeave={handleControlsPointerLeave}
        onFocus={handleControlsFocus}
        onBlur={handleControlsBlur}
      />
    </div>,
    document.body,
  );
}
