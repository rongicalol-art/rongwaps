import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { GrammarLessonScreen as GrammarLessonScreenType } from '../../screens/grammar-lesson';
import { useOpenPhase } from '../../hooks/useOpenPhase';
import { useReplacesLoader } from '../hooks/useReplacesLoader';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

const GrammarLessonScreen = lazy(() => import('../../screens/grammar-lesson').then((m) => ({ default: m.GrammarLessonScreen })));

type GrammarLessonScreenProps = React.ComponentProps<typeof GrammarLessonScreenType>;

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
  const phase = useOpenPhase(Boolean(part), undefined, shouldRender ? 'open' : 'closed');
  const cameFromLoader = useReplacesLoader(phase === 'loading', shouldRender);

  return (
    <AnimatePresence>
      {shouldRender && phase === 'loading' && (
        <WorkspaceWindow key="grammar-loader" tone="canvas">
          <LoadingScreen message="Loading grammar…" tone="canvas" />
        </WorkspaceWindow>
      )}
      {shouldRender && phase === 'ready' && part && (
        <Suspense key={part.id} fallback={<WorkspaceWindow tone="canvas"><LoadingScreen message="Loading grammar…" tone="canvas" /></WorkspaceWindow>}>
          <GrammarLessonScreen
            animateIn={!cameFromLoader}
            part={part}
            initialPageId={initialPageId}
            onClose={onClose}
            onProceedToReading={onProceedToReading}
            onNavigatePart={onNavigatePart}
          />
        </Suspense>
      )}
    </AnimatePresence>
  );
}
