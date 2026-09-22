import { AnimatePresence, motion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { GrammarLessonScreen } from '../../screens/grammar-lesson';
import { LoadingScreen } from '../../lib/widgets';

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
        <motion.div
          key="grammar-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-window bg-ui-canvas"
          style={{ paddingLeft: 'var(--workspace-nav-width, 0px)' }}
        >
          <LoadingScreen message="Loading grammar…" tone="canvas" windowOverlay />
        </motion.div>
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
