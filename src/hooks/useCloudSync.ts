import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useAppStore } from '../store/useAppStore';
import { useCloudSyncFetch } from './useCloudSyncFetch';
import { useCloudSyncSave } from './useCloudSyncSave';

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
    fetchFromCloud,
  });

  useEffect(() => {
    if (!currentUser) {
      hasFetchedForUserRef.current = null;
      lastSyncedSettingsRef.current = null;
      return;
    }
    hasFetchedForUserRef.current = null;
    void fetchFromCloud();
  }, [currentUser, fetchFromCloud]);

  return { fetchFromCloud, requestSave };
}