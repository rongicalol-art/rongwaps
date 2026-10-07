import { useRegisterSW } from 'virtual:pwa-register/react';
import { ActionButton, AlertBanner } from '../../lib/widgets';

/**
 * Single service-worker registration point. A new version waits until the user
 * accepts it, so the app is never swapped silently mid-session.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] mx-auto max-w-sm">
      <AlertBanner
        variant="info"
        message="New version available"
        onDismiss={() => setNeedRefresh(false)}
        action={(
          <ActionButton size="sm" onClick={() => void updateServiceWorker(true)}>
            Refresh
          </ActionButton>
        )}
      />
    </div>
  );
}
