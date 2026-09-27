import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import { debugLogger } from '../utils/debugLogger';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { progressService } from '../services/progressService';
import { authService } from '../services/authService';
import type { SRSData } from '../utils/srsEngine';
import {
  computeLearnedDelta,
  createCloudSyncFingerprint,
  createSingleFlightSaveCoordinator,
  getNextAutoSaveDelay,
  getNextCloudSyncBackoff,
  getSessionProgressDelta,
  hasSessionProgressDelta,
  isSessionProgressReset,
  isSameFolderList,
  type SyncedFolderSnapshot,
  type SyncProgressCounters,
} from '../utils/cloudSyncQueue';
import { getSelectedLessonIds } from '../utils/lessonPartSelection';
import {
  computeSrsDelta,
  getDailyActivity,
  getProgressCounters,
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
  lastSyncedActivityRef: MutableRefObject<string | null>;
  lastSyncedFoldersRef: MutableRefObject<SyncedFolderSnapshot[] | null>;
  lastSyncedSessionRef: MutableRefObject<SyncProgressCounters>;
  hasFetchedForUserRef: MutableRefObject<string | null>;
  fetchFromCloud: () => Promise<void>;
}

export function useCloudSyncSave({
  currentUser,
  persistedOwnerRef,
  lastSyncedSrsRef,
  lastSyncedLearnedRef,
  lastSyncedActivityRef,
  lastSyncedFoldersRef,
  lastSyncedSessionRef,
  hasFetchedForUserRef,
  fetchFromCloud,
}: UseCloudSyncSaveOptions) {
  const coordinatorRef = useRef<SaveCoordinator | null>(null);
  const performSaveRef = useRef<(snapshot: CloudSaveSnapshot) => Promise<void>>(async () => {});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveBackoffMsRef = useRef(0);
  const autoSaveDirtySinceRef = useRef<number | null>(null);

  const performSave = useCallback(async (snapshot: CloudSaveSnapshot) => {
    const { store, userId, userMetadata, deltaSrsData } = snapshot;
    if (persistedOwnerRef.current !== userId) {
      return;
    }
    await userService.syncCardProgress(userId, deltaSrsData);
    lastSyncedSrsRef.current = {
      ...(lastSyncedSrsRef.current ?? {}),
      ...deltaSrsData,
    };

    const learnedDelta = computeLearnedDelta(lastSyncedLearnedRef.current, store.learnedCards);
    let learnedSynced = false;
    if (learnedDelta.shrank || lastSyncedLearnedRef.current === null) {
      await userService.syncMetadata(userId, {
        learnedCards: store.learnedCards,
        lastActivity: store.lastActivity,
      });
      learnedSynced = true;
    } else if (learnedDelta.appended.length > 0) {
      learnedSynced = await userService.appendLearnedCards(userId, learnedDelta.appended);
      if (!learnedSynced) {
        await userService.syncMetadata(userId, {
          learnedCards: store.learnedCards,
          lastActivity: store.lastActivity,
        });
      }
    }

    if (!learnedSynced && lastSyncedActivityRef.current !== store.lastActivity) {
      await userService.syncLastActivity(userId, store.lastActivity);
    }
    lastSyncedLearnedRef.current = store.learnedCards;
    lastSyncedActivityRef.current = store.lastActivity;

    const selectedLessons = getSelectedLessonIds(store.selectedLessonParts, store.activeBookId);
    const metadataChanged =
      JSON.stringify(userMetadata.favorites) !== JSON.stringify(store.favorites) ||
      userMetadata.activeBookId !== store.activeBookId ||
      userMetadata.characterPreference !== store.characterPreference ||
      JSON.stringify(userMetadata.sessionProgressIndex) !== JSON.stringify(store.sessionProgressIndex) ||
      userMetadata.activeTab !== store.activeTab ||
      userMetadata.activeActivity !== store.activeActivity ||
      JSON.stringify(userMetadata.selectedLessons) !== JSON.stringify(selectedLessons) ||
      JSON.stringify(userMetadata.selectedBooks) !== JSON.stringify(store.selectedBooks);

    if (metadataChanged) {
      await authService.updateUserMetadata({
        favorites: store.favorites,
        activeBookId: store.activeBookId,
        characterPreference: store.characterPreference,
        sessionProgressIndex: store.sessionProgressIndex,
        activeTab: store.activeTab,
        activeActivity: store.activeActivity,
        selectedLessons,
        selectedBooks: store.selectedBooks,
      });
    }

    if (!isSameFolderList(lastSyncedFoldersRef.current, store.customFolders)) {
      await userService.syncCustomFolders(
        userId,
        store.customFolders,
        store.deletedFolderIds,
      );
      lastSyncedFoldersRef.current = [...store.customFolders];
      useAppStore.getState().setFoldersSyncedUserId(userId);
    }

    const savedSession = lastSyncedSessionRef.current;
    const snapshotSession = getProgressCounters(store);
    const dailyDelta = getSessionProgressDelta(snapshotSession, savedSession);
    if (hasSessionProgressDelta(dailyDelta)) {
      await progressService.upsertDailyProgress(userId, {
        cardsReviewed: dailyDelta.cardsReviewed,
        cardsLearned: dailyDelta.cardsLearned,
        activityType: getDailyActivity(store.lastActivity),
        activityCount: dailyDelta.cardsReviewed,
      });
      lastSyncedSessionRef.current = snapshotSession;
    } else if (isSessionProgressReset(snapshotSession, savedSession)) {
      lastSyncedSessionRef.current = snapshotSession;
    }

    useAppStore.getState().setLastCloudUpdate(new Date().toISOString());
  }, [
    lastSyncedActivityRef,
    lastSyncedFoldersRef,
    lastSyncedLearnedRef,
    lastSyncedSessionRef,
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
            userMetadata: (currentUser.user_metadata || {}) as Record<string, unknown>,
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
