import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { GrammarLessonScreen } from '../../screens/grammar-lesson';

type GrammarLessonScreenProps = React.ComponentProps<typeof GrammarLessonScreen>;

interface GrammarWindowProps {
  part: GrammarLessonScreenProps['part'] | null;
  initialPageId: GrammarLessonScreenProps['initialPageId'];
  onClose: () => void;
  onProceedToReading: NonNullable<GrammarLessonScreenProps['onProceedToReading']>;
}

/** Full-viewport grammar lesson window; AnimatePresence owns its exit. */
export function GrammarWindow({ part, initialPageId, onClose, onProceedToReading }: GrammarWindowProps) {
  // This window knows when a lesson is open, so it owns the lesson title; the
  // shell takes it back on close.
  useDocumentTitle(part?.title ?? null);

  return (
    <AnimatePresence>
      {part && (
        <GrammarLessonScreen
          key={part.id}
          part={part}
          initialPageId={initialPageId}
          onClose={onClose}
          onProceedToReading={onProceedToReading}
        />
      )}
    </AnimatePresence>
  );
}
