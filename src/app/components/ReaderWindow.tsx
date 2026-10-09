import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ReaderScreen } from '../../screens/reader';
import { useFontGate, useOpenPhase } from '../../hooks/useOpenPhase';
import { useReplacesLoader } from '../hooks/useReplacesLoader';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

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
  const readingText = activeReading
    ? activeReading.title + activeReading.paragraphs.map((p) => p.traditional + p.simplified).join('')
    : '';
  const phase = useOpenPhase(Boolean(activeReading), useFontGate(readingText), shouldRender ? 'open' : 'closed');
  const cameFromLoader = useReplacesLoader(phase === 'loading', shouldRender);

  return (
    <AnimatePresence>
      {shouldRender && phase === 'loading' && (
        <WorkspaceWindow key="reader-loader" tone="practice">
          <LoadingScreen message="Loading reading…" tone="practice" />
        </WorkspaceWindow>
      )}
      {shouldRender && phase === 'ready' && activeReading && (
        <ReaderScreen
          animateIn={!cameFromLoader}
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
