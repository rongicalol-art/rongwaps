import { useRegisterSW } from 'virtual:pwa-register/react';
import { TopToast } from '../../lib/widgets';

/**
 * Single service-worker registration point. A new version waits until the user
 * accepts it, so the app is never swapped silently mid-session.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <TopToast
      open={needRefresh}
      icon="sparkles"
      title="New version available"
      message="Refresh to get the latest update."
      dismissLabel="Later"
      onDismiss={() => setNeedRefresh(false)}
      actionLabel="Refresh"
      onAction={() => void updateServiceWorker(true)}
    />
  );
}
