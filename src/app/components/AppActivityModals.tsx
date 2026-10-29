import React, { lazy, Suspense } from 'react';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

const ActivityModals = lazy(() => import('../../screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));

type ActivityModalsProps = React.ComponentProps<typeof ActivityModals>;

function LessonFallback({ onShown }: { onShown: () => void }) {
  React.useEffect(onShown, [onShown]);
  return <WorkspaceWindow tone="practice"><LoadingScreen message="Loading lesson…" tone="practice" /></WorkspaceWindow>;
}

/** Lazy practice-modal shell. */
export function AppActivityModals(props: ActivityModalsProps) {
  const [opened, setOpened] = React.useState(false);
  const sawFallback = React.useRef(false);
  if (props.activeActivity && !opened) setOpened(true);
  if (!opened) return null;
  return (
    <Suspense fallback={<LessonFallback onShown={() => { sawFallback.current = true; }} />}>
      <ActivityModals {...props} animateIn={!sawFallback.current} />
    </Suspense>
  );
}
