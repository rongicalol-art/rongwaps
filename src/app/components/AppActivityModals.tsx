import React, { lazy, Suspense } from 'react';
import { LoadingScreen } from '../../lib/widgets';

// Activity screens stay lazy: the practice modal wrapper opens first and each
// activity streams in under its ScreenSkeleton.
const ActivityModals = lazy(() => import('../../screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));

type ActivityModalsProps = React.ComponentProps<typeof ActivityModals>;

function ActivityLoadingFallback({ activeActivity }: Pick<ActivityModalsProps, 'activeActivity'>) {
  if (!activeActivity || activeActivity === 'create-card') return null;

  return (
    <div className="absolute inset-0 z-activity flex flex-col items-center justify-center bg-ui-practice-canvas">
      <LoadingScreen
        message={
          activeActivity === 'flashcards-review'
            ? 'Loading review…'
            : activeActivity === 'flashcards-library'
            ? 'Loading deck…'
            : 'Loading lesson…'
        }
        tone="practice"
      />
    </div>
  );
}

/** Lazy practice-modal shell with the shared activity loading fallback. */
export function AppActivityModals(props: ActivityModalsProps) {
  return (
    <Suspense fallback={<ActivityLoadingFallback activeActivity={props.activeActivity} />}>
      <ActivityModals {...props} />
    </Suspense>
  );
}
