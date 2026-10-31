import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { TopToast } from '../../lib/widgets';

/**
 * Single service-worker registration point. New workers activate immediately
 * (vite.config.ts skipWaiting) and apply on the next load; this toast covers
 * the rare case where one still waits.
 */
export function PwaUpdatePrompt() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW: (_url, reg) => { registration.current = reg; } });

  useEffect(() => {
    // Tabs left open for days learn about a new deploy when the learner returns.
    const check = () => { if (document.visibilityState === 'visible') void registration.current?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

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
