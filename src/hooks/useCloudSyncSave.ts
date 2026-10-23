import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserSnapshot } from '../store/slices/authSlice';
import { debugLogger } from '../utils/debug/debugLogger';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import {
  checkpointForUser,
  createCloudSyncFingerprint,
  createSingleFlightSaveCoordinator,
  getNextAutoSaveDelay,
  getNextCloudSyncBackoff,
} from '../utils/sync/cloudSyncQueue';
import { getSelectedLessonIds } from '../utils/lesson/lessonPartSelection';
import {
  buildMetadataPayload,
  computeSrsDelta,
  hasMetadataChanged,
  AUTO_SAVE_TRIGGER_SLICES,
  type CloudSaveSnapshot,
} from '../utils/sync/cloudSyncTransforms';

interface SaveCoordinator {
  request: () => Promise<void>;
}

export interface UseCloudSyncSaveOptions {
  currentUser: User | null;
  persistedOwnerRef: MutableRefObject<string | null>;
  lastSyncedSettingsRef: MutableRefObject<Record<string, unknown> | null>;
  hasFetchedForUserRef: MutableRefObject<string | null>;
}

export function useCloudSyncSave({
  currentUser,
  persistedOwnerRef,
  lastSyncedSettingsRef,
  hasFetchedForUserRef,
}: UseCloudSyncSaveOptions) {
  const coordinatorRef = useRef<SaveCoordinator | null>(null);
  const performSaveRef = useRef<(snapshot: CloudSaveSnapshot, owner: UserSnapshot) => Promise<void>>(async () => {});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveBackoffMsRef = useRef(0);
  const autoSaveDirtySinceRef = useRef<number | null>(null);

  const performSave = useCallback(async (snapshot: CloudSaveSnapshot, owner: UserSnapshot) => {
    const { store, userId, deltaSrsData } = snapshot;
    const coordinator = coordinatorRef.current;
    const isCurrent = () => coordinatorRef.current === coordinator && coordinator !== null
      && useAppStore.getState().currentUser === owner && persistedOwnerRef.current === userId;
    if (!isCurrent()) return;
    const authorization = await userService.getSyncAuthorization(userId);
    if (!isCurrent()) return;
    await userService.syncReviewEvents(store.pendingReviewEvents, authorization);
    if (!isCurrent()) return;
    useAppStore.getState().acknowledgeReviewEvents(store.pendingReviewEvents.map(event => event.id));
    await userService.syncCardProgress(deltaSrsData, store.learnedCards, authorization);
    if (!isCurrent()) return;
    // Re-read: a pull may have advanced the checkpoint while this save ran.
    const checkpoint = checkpointForUser(useAppStore.getState().syncCheckpoint, userId);
    if (checkpoint) {
      useAppStore.getState().setSyncCheckpoint({
        ...checkpoint,
        srs: { ...checkpoint.srs, ...deltaSrsData },
      });
    }

    const settings = buildMetadataPayload(store);
    if (hasMetadataChanged(lastSyncedSettingsRef.current, settings)) {
      const serverUpdatedAt = await userService.syncSettings(userId, settings, authorization);
      if (!isCurrent()) return;
      lastSyncedSettingsRef.current = settings;
      // Server time, never this device's clock: the pull compares it with the
      // profile's (server-stamped) updated_at to decide whose settings are newer.
      if (serverUpdatedAt) useAppStore.getState().setLastCloudUpdate(serverUpdatedAt);
    }
  }, [lastSyncedSettingsRef, persistedOwnerRef]);

  performSaveRef.current = performSave;

  useEffect(() => {
    saveBackoffMsRef.current = 0;
    autoSaveDirtySinceRef.current = null;
    const owner = useAppStore.getState().currentUser;
    if (!currentUser || owner?.id !== currentUser.id) {
      coordinatorRef.current = null;
      autoSaveDirtySinceRef.current = null;
      return;
    }

    const userId = currentUser.id;
    const coordinator = createSingleFlightSaveCoordinator(
      () => {
        if (coordinatorRef.current !== coordinator || hasFetchedForUserRef.current !== userId
          || useAppStore.getState().currentUser !== owner) return null;
        const store = useAppStore.getState();
        return {
          fingerprint: createCloudSyncFingerprint(userId, {
            ...store,
            selectedLessons: getSelectedLessonIds(store.selectedLessonParts, store.activeBookId),
          }),
          value: {
            userId,
            store,
            deltaSrsData: computeSrsDelta(
              checkpointForUser(store.syncCheckpoint, userId)?.srs ?? null,
              store.srsData,
            ),
          },
        };
      },
      (snapshot) => performSaveRef.current(snapshot, owner),
    );
    coordinatorRef.current = coordinator;
    return () => {
      coordinatorRef.current = null;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [currentUser, hasFetchedForUserRef]);

  const requestSave = useCallback(async function save() {
    const owner = useAppStore.getState().currentUser;
    const coordinator = coordinatorRef.current;
    if (!currentUser || owner?.id !== currentUser.id || !coordinator
      || hasFetchedForUserRef.current !== currentUser.id) return;
    const isCurrent = () => useAppStore.getState().currentUser === owner && coordinatorRef.current === coordinator;
    const { setSyncStatus, setSyncError } = useAppStore.getState();
    setSyncStatus('syncing');
    try {
      await coordinator.request();
      if (!isCurrent()) return;
      saveBackoffMsRef.current = 0;
      autoSaveDirtySinceRef.current = null;
      setSyncStatus('success');
      setSyncError(null);
    } catch (error: unknown) {
      if (!isCurrent()) return;
      saveBackoffMsRef.current = getNextCloudSyncBackoff(saveBackoffMsRef.current, error);
      setSyncStatus('error');
      setSyncError("Couldn't save to the cloud. Your work is safe on this device — we'll retry.");
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        if (isCurrent()) void save().catch((retryError: unknown) => {
          debugLogger.error('Sync', 'Cloud save retry failed:', retryError);
        });
      }, saveBackoffMsRef.current);
      throw error;
    }
  }, [currentUser, hasFetchedForUserRef]);

  useEffect(() => {
    if (!currentUser) return;
    const requestBestEffortSave = () => {
      void requestSave().catch((error: unknown) => {
        debugLogger.error('Sync', 'Background cloud save failed:', error);
      });
    };
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') requestBestEffortSave();
    };

    window.addEventListener('blur', requestBestEffortSave);
    window.addEventListener('pagehide', requestBestEffortSave);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', requestBestEffortSave);
      window.removeEventListener('pagehide', requestBestEffortSave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, requestSave]);

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
