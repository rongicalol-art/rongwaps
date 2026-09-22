import React from 'react';
import { LayoutShell } from './LayoutShell';
import { AppRoutes } from './AppRoutes';
import { AppActivityModals } from './AppActivityModals';

interface AppWorkspaceProps {
  shell: Omit<React.ComponentProps<typeof LayoutShell>, 'children' | 'activityModals'>;
  activityModals: React.ComponentProps<typeof AppActivityModals>;
  routes: React.ComponentProps<typeof AppRoutes>;
}

/** The workspace shell: side nav, routed tab screens, and the practice modal. */
export function AppWorkspace({ shell, activityModals, routes }: AppWorkspaceProps) {
  return (
    <LayoutShell {...shell} activityModals={<AppActivityModals {...activityModals} />}>
      <AppRoutes {...routes} />
    </LayoutShell>
  );
}
