import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { progressService } from '../services/progressService';
import { authService } from '../services/authService';
import type { SRSData } from '../utils/srsEngine';
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
  /**
   * Only the SRS cards that changed since the last acknowledged sync.
   * Computed at snapshot time so writes scale with session churn, not
   * with total lifetime card count.
   */
  deltaSrsData: Record<string, SRSData>;
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

function computeSrsDelta(
  previous: Record<string, SRSData> | null,
  current: Record<string, SRSData>,
): Record<string, SRSData> {
  // First sync for this user (never pulled/saved): send everything.
  if (!previous) return current;

  const delta: Record<string, SRSData> = {};
  for (const [key, value] of Object.entries(current)) {
    const prev = previous[key];
    if (
      !prev
      || prev.efactor !== value.efactor
      || prev.interval !== value.interval
      || prev.repetition !== value.repetition
      || prev.nextReviewDate !== value.nextReviewDate
    ) {
      delta[key] = value;
    }
  }
  // Deletions are intentionally NOT tracked here: the only whole-table delete
  // path is resetLearningProgress (RPC), and per-card deletion is not exposed
  // in the UI. Stale rows, if ever created, are reconciled on the next full pull.
  return delta;
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
  // Persisted owner of the locally cached progress. Survives page reloads —
  // e.g. an OAuth redirect after signing in as a different user — so a user's
  // cached SRS data is never merged into, or uploaded to, another account.
  // Null on a fresh browser where no user has been synced yet.
  const persistedOwnerRef = useRef<string | null>(
    typeof window !== 'undefined' ? useAppStore.getState().lastActiveUserId : null,
  );
  // Last SRS state known to be persisted on the server for the current user.
  // Used to compute the per-save delta so writes scale with churn, not with
  // total lifetime card count.
  const lastSyncedSrsRef = useRef<Record<string, SRSData> | null>(null);
  // Server watermark for incremental pulls: max user_card_progress.last_updated
  // from the previous fetch. Null cursor → full pull.
  const lastPulledCursorRef = useRef<{ userId: string; cursor: string | null } | null>(null);
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

      // Detect a switch to a different account. activeUserIdRef only survives
      // within this page, so also consult the persisted owner to catch
      // switches that happen across a reload (OAuth redirect flow).
      const isAccountSwitch =
        (activeUserIdRef.current !== null && activeUserIdRef.current !== currentUser.id)
        || (persistedOwnerRef.current !== null && persistedOwnerRef.current !== currentUser.id);

      if (isAccountSwitch) {
        // Fresh account: force a full pull and never let the previous user's
        // locally cached data merge into the new account's view.
        lastPulledCursorRef.current = null;
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

      // Claim ownership of the local cache before any pull/save can run, so
      // neither merges nor saves can leak another user's data into this one.
      useAppStore.setState({ lastActiveUserId: currentUser.id });
      persistedOwnerRef.current = currentUser.id;

      // Incremental pull: after the first full pull for this user, only fetch
      // card rows updated at/after the previous pull's server watermark.
      const lastCursor = lastPulledCursorRef.current
        && lastPulledCursorRef.current.userId === currentUser.id
        ? lastPulledCursorRef.current.cursor
        : null;
      const cloudData = await userService.getProgress(
        currentUser.id,
        lastCursor ? { since: lastCursor } : undefined,
      );

      if (cloudData) {
        const cloudTime = cloudData.lastUpdated ? new Date(cloudData.lastUpdated).getTime() : 0;
        const localLastUpdate = useAppStore.getState().lastCloudUpdate;
        const localTime = localLastUpdate ? new Date(localLastUpdate).getTime() : 0;

        // Enter the merge when the pull returned any card rows too: card
        // writes update user_card_progress.last_updated but NOT
        // user_progress.updated_at, so the cloudTime gate alone would
        // silently drop incremental card updates.
        if (isAccountSwitch || cloudData.hasCardDelta || cloudTime > localTime) {
          // Metadata (favorites, selection, bookmarks) is only overwritten from
          // the cloud when the cloud is at least as new as the local state, or
          // on an account switch. A plain hasCardDelta pull must not clobber
          // local changes that are still inside the debounced save window.
          const metadataIsNewer = isAccountSwitch || cloudTime > localTime;

          if (metadataIsNewer) {
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
                  // Cloud wins only when it is strictly ahead. An explicit
                  // local clear (key absent locally but present in cloud) keeps
                  // the local view — the next save removes it server-side too.
                  if (localValue !== undefined && cloudValue > localValue) {
                    mergedIndex[key] = cloudValue;
                  }
                }
                useAppStore.setState({ sessionProgressIndex: mergedIndex });
              }
            } else if (isAccountSwitch) {
              useAppStore.setState({ sessionProgressIndex: {} });
            }
          }

          const localProgress = useAppStore.getState();
          setSrsDataAndLearnedCards(
            isAccountSwitch ? cloudData.srsData : { ...localProgress.srsData, ...cloudData.srsData },
            isAccountSwitch
              ? cloudData.learnedCards
              : Array.from(new Set([...localProgress.learnedCards, ...cloudData.learnedCards])),
          );
          // After a pull, the server state is the source of truth for these
          // cards, so future deltas are computed against the merged result.
          lastSyncedSrsRef.current = {
            ...localProgress.srsData,
            ...cloudData.srsData,
          };
        }
      }

      // Even when nothing was merged (no cloud data or cloud older than local),
      // the pull itself establishes the baseline for the next delta.
      if (isAccountSwitch) {
        lastSyncedSrsRef.current = cloudData?.srsData ?? null;
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

      // Folders follow the same rule as the other metadata: only replace the
      // local list from the cloud when the cloud is newer (or on a switch), so
      // a local add/delete inside the save window is never resurrected by a
      // pull that races the debounced save.
      if (isAccountSwitch) {
        const folders = await userService.getCustomFolders(currentUser.id);
        setCustomFolders(folders);
      }

      lastSyncedSessionRef.current = getProgressCounters(useAppStore.getState());
      hasFetchedForUserRef.current = currentUser.id;
      activeUserIdRef.current = currentUser.id;
      // Advance the incremental-pull watermark to the max card last_updated
      // the server reported, so the next fetch only pulls changes since now.
      if (cloudData?.serverLastUpdated) {
        lastPulledCursorRef.current = {
          userId: currentUser.id,
          cursor: cloudData.serverLastUpdated,
        };
      }
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
    const { store, userId, userMetadata, deltaSrsData } = snapshot;
    // Sanity check: never save the previous user's locally cached progress
    // into another user's account. The coordinator can capture a snapshot
    // right as the user switches, so re-assert the owner at save time.
    if (persistedOwnerRef.current !== userId) {
      return;
    }
    await userService.syncCardProgress(userId, deltaSrsData);
    // After a successful save, the delta is acknowledged: fold it into the
    // baseline so the next save only ships cards that changed again.
    lastSyncedSrsRef.current = {
      ...(lastSyncedSrsRef.current ?? {}),
      ...deltaSrsData,
    };
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

    // Always sync folders — including empty arrays, so deleting the last
    // folder is persisted instead of resurrecting on the next pull.
    await userService.syncCustomFolders(userId, store.customFolders);

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

    // Skip the post-save aggregate-stats re-fetch: fetchFromCloud already
    // fetched them, and local counters track the session deltas. Streak/
    // lastStudyDate refresh on the next fetchFromCloud (tab visible/mount).
    setLastCloudUpdate(new Date().toISOString());
  }, [setLastCloudUpdate]);

  performSaveRef.current = performSave;

  useEffect(() => {
    if (!currentUser) {
      coordinatorRef.current = null;
      hasFetchedForUserRef.current = null;
      lastPulledCursorRef.current = null;
      return;
    }

    const userId = currentUser.id;
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
            deltaSrsData: computeSrsDelta(lastSyncedSrsRef.current, store.srsData),
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