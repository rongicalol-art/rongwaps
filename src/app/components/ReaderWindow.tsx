import { AnimatePresence, motion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ReaderScreen } from '../../screens/reader';
import { LoadingScreen } from '../../lib/widgets';

type ReaderScreenProps = React.ComponentProps<typeof ReaderScreen>;

interface ReaderWindowProps {
  isOpen?: boolean;
  readings: ReaderScreenProps['readings'];
  /** Active reading index, or null when Reading Mode is closed. */
  index: number | null;
  onNext: ReaderScreenProps['onNext'];
  onPrevious: ReaderScreenProps['onPrevious'];
  onClose: ReaderScreenProps['onClose'];
  onOpenGrammarPart: NonNullable<ReaderScreenProps['onOpenGrammarPart']>;
}

/** Full-viewport Reading Mode window; AnimatePresence owns its exit. */
export function ReaderWindow({ isOpen = false, readings, index, onNext, onPrevious, onClose, onOpenGrammarPart }: ReaderWindowProps) {
  // This window knows when Reading Mode is open, so it owns the reading title;
  // the shell takes it back on close.
  useDocumentTitle(index !== null ? readings[index]?.title ?? null : null);

  const activeReading = index !== null && readings[index] ? readings[index] : null;
  const shouldRender = isOpen || Boolean(activeReading);

  return (
    <AnimatePresence mode="wait">
      {shouldRender && !activeReading && (
        <motion.div
          key="reader-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-window bg-ui-practice-canvas"
          style={{ paddingLeft: 'var(--workspace-nav-width, 0px)' }}
        >
          <LoadingScreen message="Loading reading…" tone="practice" windowOverlay />
        </motion.div>
      )}
      {shouldRender && activeReading && (
        <ReaderScreen
          key="reader-screen"
          readings={readings}
          index={index!}
          onNext={onNext}
          onPrevious={onPrevious}
          onClose={onClose}
          onOpenGrammarPart={onOpenGrammarPart}
        />
      )}
    </AnimatePresence>
  );
}
