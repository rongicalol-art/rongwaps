import React, { lazy, Suspense } from 'react';

// The practice shell stays lazy but renders from app start (idle-fetched), so it is loaded long
// before an activity opens. Readiness and the one loader are owned inside it (ActivityModals).
const ActivityModals = lazy(() => import('../../screens/activities/ActivityModals').then((m) => ({ default: m.ActivityModals })));

type ActivityModalsProps = React.ComponentProps<typeof ActivityModals>;

/** Lazy practice-modal shell. */
export function AppActivityModals(props: ActivityModalsProps) {
  return (
    <Suspense fallback={null}>
      <ActivityModals {...props} />
    </Suspense>
  );
}
