import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { GrammarLessonScreen } from '../../screens/grammar-lesson';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

type GrammarLessonScreenProps = React.ComponentProps<typeof GrammarLessonScreen>;

interface GrammarWindowProps {
  isOpen?: boolean;
  part: GrammarLessonScreenProps['part'] | null;
  initialPageId: GrammarLessonScreenProps['initialPageId'];
  onClose: () => void;
  onProceedToReading: NonNullable<GrammarLessonScreenProps['onProceedToReading']>;
  /** Keyboard part switching (Shift + ←/→) is owned by whoever can load a part. */
  onNavigatePart?: NonNullable<GrammarLessonScreenProps['onNavigatePart']>;
}

/** Full-viewport grammar lesson window; AnimatePresence owns its exit. */
export function GrammarWindow({
  isOpen = false,
  part,
  initialPageId,
  onClose,
  onProceedToReading,
  onNavigatePart,
}: GrammarWindowProps) {
  // This window knows when a lesson is open, so it owns the lesson title; the
  // shell takes it back on close.
  useDocumentTitle(part?.title ?? null);

  const shouldRender = isOpen || Boolean(part);

  return (
    <AnimatePresence mode="wait">
      {shouldRender && !part && (
        <WorkspaceWindow key="grammar-loader" tone="canvas">
          <LoadingScreen message="Loading grammar…" tone="canvas" />
        </WorkspaceWindow>
      )}
      {shouldRender && part && (
        <GrammarLessonScreen
          key={part.id}
          part={part}
          initialPageId={initialPageId}
          onClose={onClose}
          onProceedToReading={onProceedToReading}
          onNavigatePart={onNavigatePart}
        />
      )}
    </AnimatePresence>
  );
}
