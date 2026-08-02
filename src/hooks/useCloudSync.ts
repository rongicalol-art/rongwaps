import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { progressService } from '../services/progressService';
import { authService } from '../services/authService';
import {
  createCloudSyncFingerprint,
  createSingleFlightSaveCoordinator,
  getNextCloudSyncBackoff,
  getSessionProgressDelta,
  hasSessionProgressDelta,
  reconcileAggregateProgress,
  type SyncProgressCounters,
} from '../utils/cloudSyncQueue';
import { createEmptySessionProgress } from '../utils/reviewProgress';

type AppStoreSnapshot = ReturnType<typeof useAppStore.getState>;

interface CloudSaveSnapshot {
  userId: string;
  userMetadata: Record<string, unknown>;
  store: AppStoreSnapshot;
}

interface SaveCoordinator {
  request: () => Promise<void>;
}

function getProgressCounters(store: AppStoreSnapshot): SyncProgressCounters {
  return {
    xpEarned: store.sessionProgress.xpEarned,
    cardsReviewed: store.sessionProgress.cardsReviewed,
    cardsLearned: store.sessionProgress.cardsLearned,
  };
}

function getDailyActivity(
  activity: AppStoreSnapshot['lastActivity'],
): 'flashcards' | 'quiz' | 'listening' | 'writing' | undefined {
  if (activity === 'flashcards' || activity === 'flashcards-review') return 'flashcards';
  if (activity === 'quiz' || activity === 'listening' || activity === 'writing') return activity;
  return undefined;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : null;
}

function numberArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
    ? value
    : null;
}

function numberRecord(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  return entries.every(([, item]) => typeof item === 'number')
    ? Object.fromEntries(entries) as Record<string, number>
    : null;
}

export function useCloudSync() {
  const { currentUser } = useAuth();
  const {
    srsData,
    learnedCards,
    favorites,
    activeBookId,
    characterPreference,
    sessionProgressIndex,
    activeTab,
    activeActivity,
    selectedLessons,
    selectedBooks,
    customFolders,
    sessionProgress,
    lastActivity,
    setSrsDataAndLearnedCards,
    setProgressStats,
    setCustomFolders,
    setSyncStatus,
    setSyncError,
    setLastCloudUpdate,
  } = useAppStore();

  const hasFetchedForUserRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const coordinatorRef = useRef<SaveCoordinator | null>(null);
  const performSaveRef = useRef<(snapshot: CloudSaveSnapshot) => Promise<void>>(async () => {});
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveBackoffMsRef = useRef(0);
  const lastSyncedSessionRef = useRef<SyncProgressCounters>({
    xpEarned: 0,
    cardsReviewed: 0,
    cardsLearned: 0,
  });

  const fetchFromCloud = useCallback(async () => {
    if (!currentUser) return;

    try {
      setSyncStatus('syncing');
      setSyncError(null);

      const activeUser = await authService.getCurrentUser() || currentUser;
      const metadata = (activeUser.user_metadata || {}) as Record<string, unknown>;
      const cloudData = await userService.getProgress(currentUser.id);
      const isAccountSwitch = activeUserIdRef.current !== null && activeUserIdRef.current !== currentUser.id;

      if (cloudData) {
        const cloudTime = cloudData.lastUpdated ? new Date(cloudData.lastUpdated).getTime() : 0;
        const localLastUpdate = useAppStore.getState().lastCloudUpdate;
        const localTime = localLastUpdate ? new Date(localLastUpdate).getTime() : 0;

        if (isAccountSwitch || cloudTime > localTime) {
          const metadataFavorites = stringArray(metadata.favorites);
          const metadataLessons = numberArray(metadata.selectedLessons);
          const metadataBooks = numberArray(metadata.selectedBooks);
          const metadataSessionIndex = numberRecord(metadata.sessionProgressIndex);

          setLastCloudUpdate(cloudData.lastUpdated || null);
          if (metadataFavorites || isAccountSwitch) {
            useAppStore.setState({ favorites: metadataFavorites ?? [] });
          }
          if (typeof metadata.activeBookId === 'number') {
            useAppStore.setState({ activeBookId: metadata.activeBookId });
          } else if (isAccountSwitch) {
            useAppStore.setState({ activeBookId: 1 });
          }
          if (metadata.characterPreference === 'traditional' || metadata.characterPreference === 'simplified') {
            useAppStore.setState({ characterPreference: metadata.characterPreference });
          } else if (isAccountSwitch) {
            useAppStore.setState({ characterPreference: 'traditional' });
          }
          if (metadata.activeTab === 'path' || metadata.activeTab === 'search' || metadata.activeTab === 'library' || metadata.activeTab === 'profile') {
            useAppStore.setState({ activeTab: metadata.activeTab });
          } else if (isAccountSwitch) {
            useAppStore.setState({ activeTab: 'path' });
          }
          if (metadataLessons || isAccountSwitch) {
            useAppStore.setState({ selectedLessons: metadataLessons ?? [] });
          }
          if (metadataBooks || isAccountSwitch) {
            useAppStore.setState({ selectedBooks: metadataBooks ?? [] });
          }

          if (metadataSessionIndex) {
            const localIndex = useAppStore.getState().sessionProgressIndex;
            if (isAccountSwitch) {
              useAppStore.setState({ sessionProgressIndex: metadataSessionIndex });
            } else {
              const mergedIndex = { ...localIndex };
              for (const [key, cloudValue] of Object.entries(metadataSessionIndex)) {
                const localValue = localIndex[key];
                if (localValue === undefined || cloudValue > localValue) {
                  mergedIndex[key] = cloudValue;
                }
              }
              useAppStore.setState({ sessionProgressIndex: mergedIndex });
            }
          } else if (isAccountSwitch) {
            useAppStore.setState({ sessionProgressIndex: {} });
          }

          const localProgress = useAppStore.getState();
          setSrsDataAndLearnedCards(
            isAccountSwitch ? cloudData.srsData : { ...localProgress.srsData, ...cloudData.srsData },
            isAccountSwitch
              ? cloudData.learnedCards
              : Array.from(new Set([...localProgress.learnedCards, ...cloudData.learnedCards])),
          );
        }
      }

      const aggregateStats = await progressService.getAggregateStats(currentUser.id);
      const latest = useAppStore.getState();
      const reconciled = reconcileAggregateProgress(
        aggregateStats,
        {
          totalXp: latest.totalXp,
          totalCardsReviewed: latest.totalCardsReviewed,
          totalCardsLearned: latest.totalCardsLearned,
        },
        lastSyncedSessionRef.current,
        getProgressCounters(latest),
      );
      setProgressStats({ ...aggregateStats, ...reconciled });

      const folders = await userService.getCustomFolders(currentUser.id);
      setCustomFolders(folders);

      lastSyncedSessionRef.current = getProgressCounters(useAppStore.getState());
      hasFetchedForUserRef.current = currentUser.id;
      activeUserIdRef.current = currentUser.id;
      setSyncStatus('success');
    } catch (error: unknown) {
      console.error('Failed to fetch from cloud:', error);
      setSyncStatus('error');
      setSyncError(errorMessage(error, 'Failed to sync from cloud'));
    }
  }, [
    currentUser,
    setCustomFolders,
    setLastCloudUpdate,
    setProgressStats,
    setSrsDataAndLearnedCards,
    setSyncError,
    setSyncStatus,
  ]);

  const performSave = useCallback(async (snapshot: CloudSaveSnapshot) => {
    const { store, userId, userMetadata } = snapshot;
    await userService.syncCardProgress(userId, store.srsData);
    await userService.syncMetadata(userId, {
      learnedCards: store.learnedCards,
      lastActivity: store.lastActivity,
    });

    const metadataChanged =
      JSON.stringify(userMetadata.favorites) !== JSON.stringify(store.favorites) ||
      userMetadata.activeBookId !== store.activeBookId ||
      userMetadata.characterPreference !== store.characterPreference ||
      JSON.stringify(userMetadata.sessionProgressIndex) !== JSON.stringify(store.sessionProgressIndex) ||
      userMetadata.activeTab !== store.activeTab ||
      userMetadata.activeActivity !== store.activeActivity ||
      JSON.stringify(userMetadata.selectedLessons) !== JSON.stringify(store.selectedLessons) ||
      JSON.stringify(userMetadata.selectedBooks) !== JSON.stringify(store.selectedBooks);

    if (metadataChanged) {
      await authService.updateUserMetadata({
        favorites: store.favorites,
        activeBookId: store.activeBookId,
        characterPreference: store.characterPreference,
        sessionProgressIndex: store.sessionProgressIndex,
        activeTab: store.activeTab,
        activeActivity: store.activeActivity,
        selectedLessons: store.selectedLessons,
        selectedBooks: store.selectedBooks,
      });
    }

    if (store.customFolders.length > 0) {
      await userService.syncCustomFolders(userId, store.customFolders);
    }

    const savedSession = lastSyncedSessionRef.current;
    const snapshotSession = getProgressCounters(store);
    const dailyDelta = getSessionProgressDelta(snapshotSession, savedSession);
    if (hasSessionProgressDelta(dailyDelta)) {
      await progressService.upsertDailyProgress(userId, {
        xpEarned: dailyDelta.xpEarned,
        cardsReviewed: dailyDelta.cardsReviewed,
        cardsLearned: dailyDelta.cardsLearned,
        activityType: getDailyActivity(store.lastActivity),
        activityCount: dailyDelta.cardsReviewed,
      });
      lastSyncedSessionRef.current = snapshotSession;
    }

    const aggregateStats = await progressService.getAggregateStats(userId);
    const latest = useAppStore.getState();
    const reconciled = reconcileAggregateProgress(
      aggregateStats,
      {
        totalXp: latest.totalXp,
        totalCardsReviewed: latest.totalCardsReviewed,
        totalCardsLearned: latest.totalCardsLearned,
      },
      lastSyncedSessionRef.current,
      getProgressCounters(latest),
    );
    setProgressStats({ ...aggregateStats, ...reconciled });
    setLastCloudUpdate(new Date().toISOString());
  }, [setLastCloudUpdate, setProgressStats]);

  performSaveRef.current = performSave;

  useEffect(() => {
    if (!currentUser) {
      coordinatorRef.current = null;
      hasFetchedForUserRef.current = null;
      return;
    }

    const userId = currentUser.id;
    const isAccountSwitch = activeUserIdRef.current !== null && activeUserIdRef.current !== userId;
    if (isAccountSwitch) {
      useAppStore.setState({
        srsData: {},
        learnedCards: [],
        favorites: [],
        customFolders: [],
        sessionProgress: createEmptySessionProgress(),
        sessionProgressIndex: {},
        selectedLessonParts: {},
        selectedLessons: [],
        selectedBooks: [],
        activeActivity: null,
        lastActivity: null,
        currentStreak: 0,
        longestStreak: 0,
        totalXp: 0,
        totalCardsReviewed: 0,
        totalCardsLearned: 0,
        lastStudyDate: null,
        lastCloudUpdate: null,
      });
    }
    coordinatorRef.current = createSingleFlightSaveCoordinator(
      () => {
        if (hasFetchedForUserRef.current !== userId) return null;
        const store = useAppStore.getState();
        return {
          fingerprint: createCloudSyncFingerprint(userId, store),
          value: {
            userId,
            userMetadata: (currentUser.user_metadata || {}) as Record<string, unknown>,
            store,
          },
        };
      },
      (snapshot) => performSaveRef.current(snapshot),
    );
  }, [currentUser]);

  const requestSave = useCallback(async () => {
    if (!currentUser || !coordinatorRef.current) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      await coordinatorRef.current.request();
      saveBackoffMsRef.current = 0;
      setSyncStatus('success');
    } catch (error: unknown) {
      saveBackoffMsRef.current = getNextCloudSyncBackoff(saveBackoffMsRef.current, error);
      setSyncStatus('error');
      setSyncError(errorMessage(error, 'Failed to save to cloud'));
      throw error;
    }
  }, [currentUser, setSyncError, setSyncStatus]);

  useEffect(() => {
    if (!currentUser) return;
    hasFetchedForUserRef.current = null;
    lastSyncedSessionRef.current = getProgressCounters(useAppStore.getState());
    void fetchFromCloud();
  }, [currentUser, fetchFromCloud]);

  useEffect(() => {
    if (!currentUser) return;
    const requestBestEffortSave = () => {
      void requestSave().catch((error: unknown) => {
        console.error('Background cloud save failed:', error);
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
    if (!currentUser || hasFetchedForUserRef.current !== currentUser.id) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(() => {
      void requestSave().catch((error: unknown) => {
        console.error('Auto-save failed:', error);
      });
    }, 10_000 + saveBackoffMsRef.current);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [
    activeActivity,
    activeBookId,
    activeTab,
    characterPreference,
    currentUser,
    customFolders,
    favorites,
    lastActivity,
    learnedCards,
    requestSave,
    selectedBooks,
    selectedLessons,
    sessionProgress,
    sessionProgressIndex,
    srsData,
  ]);
}
