import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { ReaderScreen as ReaderScreenType } from '../../screens/reader';
import { useFontGate, useOpenPhase } from '../../hooks/useOpenPhase';
import { usePreloadedModule } from '../../hooks/useReadyAction';
import { useReplacesLoader } from '../hooks/useReplacesLoader';
import { readerScreenModule } from '../screenModules';
import { readingFontText } from '../studyLaunch';
import { ActionButton, EmptyState, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

type ReaderScreenProps = React.ComponentProps<typeof ReaderScreenType>;

interface ReaderWindowProps {
  /** False when opening beneath a window that is already leaving (grammar), so the hub never shows between them. */
  animateIn?: boolean;
  isOpen?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  readings: ReaderScreenProps['readings'];
  sessionIndices?: ReaderScreenProps['sessionIndices'];
  onSelectReading?: ReaderScreenProps['onSelectReading'];
  /** Active reading index, or null when Reading Mode is closed. */
  index: number | null;
  onNext: ReaderScreenProps['onNext'];
  onPrevious: ReaderScreenProps['onPrevious'];
  onClose: ReaderScreenProps['onClose'];
  onOpenGrammarPart: NonNullable<ReaderScreenProps['onOpenGrammarPart']>;
}

/** Full-viewport Reading Mode window; AnimatePresence owns its exit. */
export function ReaderWindow({ animateIn = true, isOpen = false, loadError = false, onRetry, readings, sessionIndices, onSelectReading, index, onNext, onPrevious, onClose, onOpenGrammarPart }: ReaderWindowProps) {
  // This window knows when Reading Mode is open, so it owns the reading title;
  // the shell takes it back on close.
  useDocumentTitle(index !== null ? readings[index]?.title ?? null : null);

  const activeReading = index !== null && readings[index] ? readings[index] : null;
  const shouldRender = isOpen || Boolean(activeReading);
  // Scrolling changes the audio target, while the whole selected session stays mounted.
  const readingText = readingFontText((sessionIndices?.length ? sessionIndices.map((partIndex) => readings[partIndex]) : [activeReading])
    .filter((reading) => reading != null));
  const screen = usePreloadedModule(readerScreenModule, shouldRender);
  const phase = useOpenPhase(Boolean(activeReading) && Boolean(screen), useFontGate(readingText), shouldRender ? 'open' : 'closed');
  const cameFromLoader = useReplacesLoader(phase === 'loading', shouldRender);

  return (
    <AnimatePresence>
      {shouldRender && (phase === 'loading' || loadError) && (
        <WorkspaceWindow key="reader-loader" tone="practice" animateIn={animateIn}>
          {loadError ? <EmptyState title="Reading couldn’t load" description="Check your connection, then try again." action={<div className="flex gap-3"><ActionButton onClick={onRetry}>Retry</ActionButton><ActionButton variant="secondary" onClick={onClose}>Back</ActionButton></div>} />
            : <><LoadingScreen message="Loading reading…" tone="practice" /><div className="absolute inset-x-0 bottom-8 z-content flex justify-center"><ActionButton variant="secondary" onClick={onClose}>Cancel</ActionButton></div></>}
        </WorkspaceWindow>
      )}
      {shouldRender && phase === 'ready' && activeReading && screen && (
        <screen.ReaderScreen
          animateIn={animateIn && !cameFromLoader}
          key="reader-screen"
          readings={readings}
          sessionIndices={sessionIndices}
          onSelectReading={onSelectReading}
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
