import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { GrammarLessonScreen as GrammarLessonScreenType } from '../../screens/grammar-lesson';
import { useOpenPhase } from '../../hooks/useOpenPhase';
import { usePreloadedModule } from '../../hooks/useReadyAction';
import { useReplacesLoader } from '../hooks/useReplacesLoader';
import { grammarScreenModule } from '../screenModules';
import { ActionButton, EmptyState, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

type GrammarLessonScreenProps = React.ComponentProps<typeof GrammarLessonScreenType>;

interface GrammarWindowProps {
  isOpen?: boolean;
  part: GrammarLessonScreenProps['part'] | null;
  loadError?: boolean;
  onRetry?: () => void;
  initialPageId: GrammarLessonScreenProps['initialPageId'];
  onClose: () => void;
  onProceedToReading: NonNullable<GrammarLessonScreenProps['onProceedToReading']>;
}

/** Full-viewport grammar lesson window; AnimatePresence owns its exit. */
export function GrammarWindow({
  isOpen = false,
  part,
  loadError = false,
  onRetry,
  initialPageId,
  onClose,
  onProceedToReading,
}: GrammarWindowProps) {
  // This window knows when a lesson is open, so it owns the lesson title; the
  // shell takes it back on close.
  useDocumentTitle(part?.title ?? null);

  const shouldRender = isOpen || Boolean(part);
  // Opens once the lesson data and the screen's code are both here (loaded ahead by a waiting Start button, usually).
  const screen = usePreloadedModule(grammarScreenModule, shouldRender);
  const phase = useOpenPhase(Boolean(part) && Boolean(screen), undefined, shouldRender ? 'open' : 'closed');
  const cameFromLoader = useReplacesLoader(phase === 'loading', shouldRender);

  return (
    <AnimatePresence>
      {shouldRender && (phase === 'loading' || loadError) && (
        <WorkspaceWindow key="grammar-loader" tone="canvas">
          {loadError ? <EmptyState title="Lesson couldn’t load" description="Check your connection, then try again." action={<div className="flex gap-3"><ActionButton onClick={onRetry}>Retry</ActionButton><ActionButton variant="secondary" onClick={onClose}>Back</ActionButton></div>} />
            : <><LoadingScreen message="Loading grammar…" tone="canvas" /><div className="absolute inset-x-0 bottom-8 z-content flex justify-center"><ActionButton variant="secondary" onClick={onClose}>Cancel</ActionButton></div></>}
        </WorkspaceWindow>
      )}
      {shouldRender && phase === 'ready' && part && screen && (
        <screen.GrammarLessonScreen
          key={part.id}
          animateIn={!cameFromLoader}
          part={part}
          initialPageId={initialPageId}
          onClose={onClose}
          onProceedToReading={onProceedToReading}
        />
      )}
    </AnimatePresence>
  );
}
