import { AnimatePresence } from 'motion/react';
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
