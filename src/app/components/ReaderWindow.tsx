import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { ReaderScreen as ReaderScreenType } from '../../screens/reader';
import { useFontGate, useOpenPhase } from '../../hooks/useOpenPhase';
import { useReplacesLoader } from '../hooks/useReplacesLoader';
import { ActionButton, EmptyState, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

const ReaderScreen = lazy(() => import('../../screens/reader').then((m) => ({ default: m.ReaderScreen })));

type ReaderScreenProps = React.ComponentProps<typeof ReaderScreenType>;

interface ReaderWindowProps {
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
export function ReaderWindow({ isOpen = false, loadError = false, onRetry, readings, sessionIndices, onSelectReading, index, onNext, onPrevious, onClose, onOpenGrammarPart }: ReaderWindowProps) {
  // This window knows when Reading Mode is open, so it owns the reading title;
  // the shell takes it back on close.
  useDocumentTitle(index !== null ? readings[index]?.title ?? null : null);

  const activeReading = index !== null && readings[index] ? readings[index] : null;
  const shouldRender = isOpen || Boolean(activeReading);
  // Scrolling changes the audio target, while the whole selected session stays mounted.
  const readingText = (sessionIndices?.length ? sessionIndices.map((partIndex) => readings[partIndex]) : [activeReading])
    .filter((reading) => reading != null)
    .map((reading) => reading.title + reading.paragraphs.map((p) => p.traditional + p.simplified).join(''))
    .join('');
  const phase = useOpenPhase(Boolean(activeReading), useFontGate(readingText), shouldRender ? 'open' : 'closed');
  const cameFromLoader = useReplacesLoader(phase === 'loading', shouldRender);

  return (
    <AnimatePresence>
      {shouldRender && (phase === 'loading' || loadError) && (
        <WorkspaceWindow key="reader-loader" tone="practice">
          {loadError ? <EmptyState title="Reading couldn’t load" description="Check your connection, then try again." action={<div className="flex gap-3"><ActionButton onClick={onRetry}>Retry</ActionButton><ActionButton variant="secondary" onClick={onClose}>Back</ActionButton></div>} />
            : <><LoadingScreen message="Loading reading…" tone="practice" /><div className="absolute inset-x-0 bottom-8 z-content flex justify-center"><ActionButton variant="secondary" onClick={onClose}>Cancel</ActionButton></div></>}
        </WorkspaceWindow>
      )}
      {shouldRender && phase === 'ready' && activeReading && (
        <Suspense key="reader-screen" fallback={<WorkspaceWindow tone="practice"><LoadingScreen message="Loading reading…" tone="practice" /></WorkspaceWindow>}>
          <ReaderScreen
            animateIn={!cameFromLoader}
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
        </Suspense>
      )}
    </AnimatePresence>
  );
}
