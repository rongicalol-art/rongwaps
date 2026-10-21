import React, { lazy, Suspense } from 'react';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';

const ActivityModals = lazy(() => import('../../screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));

type ActivityModalsProps = React.ComponentProps<typeof ActivityModals>;

/** Lazy practice-modal shell. */
export function AppActivityModals(props: ActivityModalsProps) {
  const [opened, setOpened] = React.useState(false);
  if (props.activeActivity && !opened) setOpened(true);
  if (!opened) return null;
  return (
    <Suspense fallback={<WorkspaceWindow tone="practice"><LoadingScreen message="Loading lesson…" tone="practice" /></WorkspaceWindow>}>
      <ActivityModals {...props} />
    </Suspense>
  );
}
