import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import { debugLogger } from '../utils/debugLogger';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import type { SRSData } from '../utils/srsEngine';
import {
  computeLearnedDelta,
  createCloudSyncFingerprint,
  createSingleFlightSaveCoordinator,
  getNextAutoSaveDelay,
  getNextCloudSyncBackoff,
} from '../utils/cloudSyncQueue';
import { getSelectedLessonIds } from '../utils/lessonPartSelection';
import {
  buildMetadataPayload,
  computeSrsDelta,
  hasMetadataChanged,
  AUTO_SAVE_TRIGGER_SLICES,
  type CloudSaveSnapshot,
} from '../utils/cloudSyncTransforms';

interface SaveCoordinator {
  request: () => Promise<void>;
}

export interface UseCloudSyncSaveOptions {
  currentUser: User | null;
  persistedOwnerRef: MutableRefObject<string | null>;
  lastSyncedSrsRef: MutableRefObject<Record<string, SRSData> | null>;
  lastSyncedLearnedRef: MutableRefObject<string[] | null>;
  lastSyncedSettingsRef: MutableRefObject<Record<string, unknown> | null>;
  hasFetchedForUserRef: MutableRefObject<string | null>;
  fetchFromCloud: () => Promise<void>;
}

export function useCloudSyncSave({
  currentUser,
  persistedOwnerRef,
  lastSyncedSrsRef,
  lastSyncedLearnedRef,
  lastSyncedSettingsRef,
  hasFetchedForUserRef,
  fetchFromCloud,
}: UseCloudSyncSaveOptions) {
  const coordinatorRef = useRef<SaveCoordinator | null>(null);
  const performSaveRef = useRef<(snapshot: CloudSaveSnapshot) => Promise<void>>(async () => {});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveBackoffMsRef = useRef(0);
  const autoSaveDirtySinceRef = useRef<number | null>(null);

  const performSave = useCallback(async (snapshot: CloudSaveSnapshot) => {
    const { store, userId, deltaSrsData } = snapshot;
    if (persistedOwnerRef.current !== userId) {
      return;
    }
    await userService.syncCardProgress(userId, deltaSrsData);
    lastSyncedSrsRef.current = {
      ...(lastSyncedSrsRef.current ?? {}),
      ...deltaSrsData,
    };

    const learnedDelta = computeLearnedDelta(lastSyncedLearnedRef.current, store.learnedCards);
    if (learnedDelta.shrank || lastSyncedLearnedRef.current === null) {
      await userService.replaceLearnedCards(store.learnedCards);
    } else if (learnedDelta.appended.length > 0) {
      await userService.appendLearnedCards(learnedDelta.appended);
    }
    lastSyncedLearnedRef.current = store.learnedCards;

    const settings = buildMetadataPayload(store);
    if (hasMetadataChanged(lastSyncedSettingsRef.current, settings)) {
      const serverUpdatedAt = await userService.syncSettings(userId, settings);
      lastSyncedSettingsRef.current = settings;
      // Server time, never this device's clock: the pull compares it with the
      // profile's (server-stamped) updated_at to decide whose settings are newer.
      if (serverUpdatedAt) useAppStore.getState().setLastCloudUpdate(serverUpdatedAt);
    }
  }, [
    lastSyncedLearnedRef,
    lastSyncedSettingsRef,
    lastSyncedSrsRef,
    persistedOwnerRef,
  ]);

  performSaveRef.current = performSave;

  useEffect(() => {
    if (!currentUser) {
      coordinatorRef.current = null;
      autoSaveDirtySinceRef.current = null;
      return;
    }

    const userId = currentUser.id;
    coordinatorRef.current = createSingleFlightSaveCoordinator(
      () => {
        if (hasFetchedForUserRef.current !== userId) return null;
        const store = useAppStore.getState();
        return {
          fingerprint: createCloudSyncFingerprint(userId, {
            ...store,
            selectedLessons: getSelectedLessonIds(store.selectedLessonParts, store.activeBookId),
          }),
          value: {
            userId,
            store,
            deltaSrsData: computeSrsDelta(lastSyncedSrsRef.current, store.srsData),
          },
        };
      },
      (snapshot) => performSaveRef.current(snapshot),
    );
  }, [currentUser, hasFetchedForUserRef, lastSyncedSrsRef]);

  const requestSave = useCallback(async () => {
    if (!currentUser || !coordinatorRef.current) return;
    const { setSyncStatus, setSyncError } = useAppStore.getState();
    setSyncStatus('syncing');
    try {
      await coordinatorRef.current.request();
      saveBackoffMsRef.current = 0;
      autoSaveDirtySinceRef.current = null;
      setSyncStatus('success');
      setSyncError(null);
    } catch (error: unknown) {
      saveBackoffMsRef.current = getNextCloudSyncBackoff(saveBackoffMsRef.current, error);
      setSyncStatus('error');
      setSyncError("Couldn't save to the cloud. Your work is safe on this device — we'll retry.");
      throw error;
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const requestBestEffortSave = () => {
      void requestSave().catch((error: unknown) => {
        debugLogger.error('Sync', 'Background cloud save failed:', error);
      });
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void fetchFromCloud();
      else requestBestEffortSave();
    };

    window.addEventListener('blur', requestBestEffortSave);
    window.addEventListener('pagehide', requestBestEffortSave);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', requestBestEffortSave);
      window.removeEventListener('pagehide', requestBestEffortSave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, fetchFromCloud, requestSave]);

  useEffect(() => {
    if (!currentUser) return;

    const scheduleDebouncedSave = () => {
      if (hasFetchedForUserRef.current !== currentUser.id) return;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      const nowMs = Date.now();
      if (autoSaveDirtySinceRef.current == null) autoSaveDirtySinceRef.current = nowMs;

      syncTimeoutRef.current = setTimeout(() => {
        void requestSave().catch((error: unknown) => {
          debugLogger.error('Sync', 'Auto-save failed:', error);
        });
      }, getNextAutoSaveDelay({
        dirtySinceMs: autoSaveDirtySinceRef.current,
        nowMs,
        backoffMs: saveBackoffMsRef.current,
      }));
    };

    scheduleDebouncedSave();

    const unsubscribe = useAppStore.subscribe((state, previousState) => {
      for (const slice of AUTO_SAVE_TRIGGER_SLICES) {
        if (state[slice] !== previousState[slice]) {
          scheduleDebouncedSave();
          return;
        }
      }
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [currentUser, hasFetchedForUserRef, requestSave]);

  return { requestSave };
}
