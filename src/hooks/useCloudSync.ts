import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useAppStore } from '../store/useAppStore';
import { useCloudSyncFetch } from './useCloudSyncFetch';
import { useCloudSyncSave } from './useCloudSyncSave';
import { getNextCloudSyncBackoff } from '../utils/sync/cloudSyncQueue';
import { debugLogger } from '../utils/debug/debugLogger';

/**
 * Cloud sync composition root.
 *
 * Coordinates authentication state, pull/merge lifecycle (useCloudSyncFetch),
 * and dirty-tracking/debounced save lifecycle (useCloudSyncSave).
 */
export function useCloudSync() {
  const { currentUser } = useAuth();

  const hasFetchedForUserRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const persistedOwnerRef = useRef<string | null>(
    typeof window !== 'undefined' ? useAppStore.getState().lastActiveUserId : null,
  );
  const lastSyncedSettingsRef = useRef<Record<string, unknown> | null>(null);

  const { fetchFromCloud } = useCloudSyncFetch({
    currentUser,
    persistedOwnerRef,
    lastSyncedSettingsRef,
    hasFetchedForUserRef,
    activeUserIdRef,
  });

  const { requestSave } = useCloudSyncSave({
    currentUser,
    persistedOwnerRef,
    lastSyncedSettingsRef,
    hasFetchedForUserRef,
  });

  useEffect(() => {
    if (!currentUser) {
      hasFetchedForUserRef.current = null;
      lastSyncedSettingsRef.current = null;
      return;
    }
    hasFetchedForUserRef.current = null;
    const owner = useAppStore.getState().currentUser;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let backoffMs = 0;
    let pullRevision = 0;
    const pull = async () => {
      if (cancelled || useAppStore.getState().currentUser !== owner) return;
      const revision = ++pullRevision;
      clearTimeout(retry);
      const loaded = await fetchFromCloud();
      if (cancelled || revision !== pullRevision || useAppStore.getState().currentUser !== owner) return;
      if (loaded) {
        backoffMs = 0;
        void requestSave().catch((error: unknown) => debugLogger.error('Sync', 'Post-pull save failed:', error));
      } else {
        backoffMs = getNextCloudSyncBackoff(backoffMs, null);
        retry = setTimeout(() => { void pull(); }, backoffMs);
      }
    };
    const reconnect = () => { void pull(); };
    const visible = () => { if (document.visibilityState === 'visible') reconnect(); };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', visible);
    void pull();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [currentUser, fetchFromCloud, requestSave]);

  return { fetchFromCloud, requestSave };
}
