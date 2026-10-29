import { lazy, Suspense } from 'react';

const BookPageViewer = lazy(() =>
  import('./BookPageViewer').then((m) => ({ default: m.BookPageViewer })),
);

interface GrammarBookPageViewerProps {
  bookId: number;
  lessonId: number;
  grammarTitle: string;
  pages: number[];
  onClose: () => void;
}

/** Lazy book viewer with its own full-screen loading shell. */
export function GrammarBookPageViewer({
  bookId,
  lessonId,
  grammarTitle,
  pages,
  onClose,
}: GrammarBookPageViewerProps) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading book"
          className="fixed inset-0 z-shell flex flex-col items-center justify-center gap-5 bg-black"
        >
          <span className="h-11 w-11 animate-spin rounded-full border-4 border-white/25 border-t-white" />
          <span className="text-xs font-black uppercase tracking-widest text-white/70">
            Loading book…
          </span>
        </div>
      }
    >
      <BookPageViewer
        bookId={bookId}
        lessonId={lessonId}
        grammarTitle={grammarTitle}
        pages={pages}
        onClose={onClose}
      />
    </Suspense>
  );
}
