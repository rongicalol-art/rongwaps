import { useEffect, useRef, useState } from 'react';
import { AppIcon, IconActionButton, ScreenHeader } from '../../../lib/widgets';
import { useModalFocus } from '../../../hooks/useModalFocus';

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
  const [pageIndex, setPageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const page = pages[pageIndex];
  const modalFocusProps = useModalFocus({
    containerRef: dialogRef,
    isActive: true,
    onEscape: onClose,
  });

  useEffect(() => setImageFailed(false), [page]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Book reference for ${grammarTitle}`}
      tabIndex={-1}
      className="absolute inset-0 z-[40] flex flex-col overflow-hidden bg-ui-canvas outline-none"
      {...modalFocusProps}
    >
      <ScreenHeader
        maxWidth="none"
        onClose={onClose}
        centerContent={(
          <div className="min-w-0 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.08em] text-brand-primary">
              Lesson {lessonId} · Book reference
            </p>
            <h1 className="truncate text-sm font-black text-ui-ink-strong sm:text-base">
              Printed page {page}
            </h1>
          </div>
        )}
        rightAction={(
          <div className="flex items-center gap-0.5">
            <IconActionButton
              icon={<AppIcon name="back" size={17} />}
              label="Previous book page"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
            />
            <span className="min-w-8 text-center text-[11px] font-black tabular-nums text-ui-muted-strong">
              {pageIndex + 1}/{pages.length}
            </span>
            <IconActionButton
              icon={<AppIcon name="forward" size={17} />}
              label="Next book page"
              size="sm"
              disabled={pageIndex === pages.length - 1}
              onClick={() => setPageIndex((index) => Math.min(pages.length - 1, index + 1))}
            />
          </div>
        )}
      />

      <main className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex min-h-full w-full max-w-[920px] items-start justify-center">
          {imageFailed ? (
            <div className="mt-16 max-w-md text-center">
              <p className="text-lg font-black text-ui-ink-strong">Book page unavailable</p>
              <p className="mt-2 text-sm font-bold leading-6 text-ui-muted-strong">
                The reference is printed page {page}. Export this page from the source PDF to add it here.
              </p>
            </div>
          ) : (
            <img
              key={page}
              src={bookPageImageUrl(bookId, page)}
              alt={`Scanned source book page ${page} for ${grammarTitle}`}
              className="h-auto w-full bg-ui-surface shadow-[0_3px_0_var(--color-ui-border)]"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
