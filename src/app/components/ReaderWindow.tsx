import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ReaderScreen } from '../../screens/reader';

type ReaderScreenProps = React.ComponentProps<typeof ReaderScreen>;

interface ReaderWindowProps {
  readings: ReaderScreenProps['readings'];
  /** Active reading index, or null when Reading Mode is closed. */
  index: number | null;
  onNavigate: ReaderScreenProps['onNavigate'];
  onClose: ReaderScreenProps['onClose'];
  onOpenGrammarPart: NonNullable<ReaderScreenProps['onOpenGrammarPart']>;
}

/** Full-viewport Reading Mode window; AnimatePresence owns its exit. */
export function ReaderWindow({ readings, index, onNavigate, onClose, onOpenGrammarPart }: ReaderWindowProps) {
  // This window knows when Reading Mode is open, so it owns the reading title;
  // the shell takes it back on close.
  useDocumentTitle(index !== null ? readings[index]?.title ?? null : null);

  return (
    <AnimatePresence>
      {index !== null && readings[index] && (
        <ReaderScreen
          key="reader-screen"
          readings={readings}
          index={index}
          onNavigate={onNavigate}
          onClose={onClose}
          onOpenGrammarPart={onOpenGrammarPart}
        />
      )}
    </AnimatePresence>
  );
}
