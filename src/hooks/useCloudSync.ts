import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useAppStore } from '../store/useAppStore';
import type { SRSData } from '../utils/srsEngine';
import type {
  SyncedFolderSnapshot,
  SyncProgressCounters,
} from '../utils/cloudSyncQueue';
import { getProgressCounters } from '../utils/cloudSyncTransforms';
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
  const lastSyncedSrsRef = useRef<Record<string, SRSData> | null>(null);
  const lastPulledCursorRef = useRef<{ userId: string; cursor: string | null } | null>(null);
  const lastSyncedLearnedRef = useRef<string[] | null>(null);
  const lastSyncedActivityRef = useRef<string | null>(null);
  const lastSyncedFoldersRef = useRef<SyncedFolderSnapshot[] | null>(null);
  const lastSyncedSessionRef = useRef<SyncProgressCounters>({
    cardsReviewed: 0,
    cardsLearned: 0,
  });

  const { fetchFromCloud } = useCloudSyncFetch({
    currentUser,
    persistedOwnerRef,
    lastSyncedSrsRef,
    lastPulledCursorRef,
    lastSyncedLearnedRef,
    lastSyncedActivityRef,
    lastSyncedFoldersRef,
    lastSyncedSessionRef,
    hasFetchedForUserRef,
    activeUserIdRef,
  });

  const { requestSave } = useCloudSyncSave({
    currentUser,
    persistedOwnerRef,
    lastSyncedSrsRef,
    lastSyncedLearnedRef,
    lastSyncedActivityRef,
    lastSyncedFoldersRef,
    lastSyncedSessionRef,
    hasFetchedForUserRef,
    fetchFromCloud,
  });

  useEffect(() => {
    if (!currentUser) {
      hasFetchedForUserRef.current = null;
      lastPulledCursorRef.current = null;
      lastSyncedLearnedRef.current = null;
      lastSyncedActivityRef.current = null;
      lastSyncedFoldersRef.current = null;
      return;
    }
    hasFetchedForUserRef.current = null;
    lastSyncedSessionRef.current = getProgressCounters(useAppStore.getState());
    void fetchFromCloud();
  }, [currentUser, fetchFromCloud]);

  return { fetchFromCloud, requestSave };
}