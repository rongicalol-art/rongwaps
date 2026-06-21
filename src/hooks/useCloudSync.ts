import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { progressService } from '../services/progressService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

export function useCloudSync() {
  const { currentUser } = useAuth();
  const {
    srsData,
    learnedCards,
    setSrsDataAndLearnedCards,
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
    lastActivity: lastActivityType,
    setProgressStats,
    setCustomFolders,
    setSyncStatus,
    setSyncError,
    setLastCloudUpdate,
  } = useAppStore();

  const lastSyncedUserId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDailySyncCount = useRef(0);
  const hasFetchedForUser = useRef<string | null>(null);
  const isSaving = useRef(false);
  const saveBackoffMs = useRef(0);
  const pendingSave = useRef(false);

  // ── Fetch from cloud ──────────────────────────────────────────────
  const fetchFromCloud = useCallback(async () => {
    if (!currentUser) return;
    try {
      setSyncStatus('syncing');
      setSyncError(null);

      const activeUser = await authService.getCurrentUser() || currentUser;
      const metadata = activeUser.user_metadata;

      const localLastUpdate = useAppStore.getState().lastCloudUpdate;

      // 1. Fetch card-level SRS progress + legacy metadata
      const cloudData = await userService.getProgress(currentUser.id);

      if (cloudData) {
        const cloudTime = cloudData.lastUpdated
          ? new Date(cloudData.lastUpdated).getTime()
          : 0;
        const localTime = localLastUpdate
          ? new Date(localLastUpdate).getTime()
          : 0;

        // Only override local if cloud is strictly newer
        if (cloudTime > localTime) {
          setLastCloudUpdate(cloudData.lastUpdated || null);

          // Restore from user_metadata (preferences, session state)
          if (metadata) {
            if (metadata.favorites && Array.isArray(metadata.favorites)) {
              useAppStore.setState({ favorites: metadata.favorites });
            }
            if (metadata.activeBookId) {
              useAppStore.setState({ activeBookId: metadata.activeBookId });
            }
            if (metadata.characterPreference) {
              useAppStore.setState({ characterPreference: metadata.characterPreference });
            }
            if (metadata.activeTab) {
              useAppStore.setState({ activeTab: metadata.activeTab });
            }
            if (metadata.activeActivity !== undefined) {
              useAppStore.setState({ activeActivity: metadata.activeActivity });
            }
            if (metadata.selectedLessons) {
              useAppStore.setState({ selectedLessons: metadata.selectedLessons });
            }
            if (metadata.selectedBooks) {
              useAppStore.setState({ selectedBooks: metadata.selectedBooks });
            }
            if (metadata.sessionProgressIndex) {
              const localIndex = useAppStore.getState().sessionProgressIndex || {};
              const mergedIndex = { ...localIndex };
              for (const [key, cloudVal] of Object.entries(metadata.sessionProgressIndex)) {
                const localVal = localIndex[key];
                if (localVal === undefined || (typeof cloudVal === 'number' && cloudVal > (localVal as number))) {
                  mergedIndex[key] = cloudVal as number;
                }
              }
              useAppStore.setState({ sessionProgressIndex: mergedIndex });
            }
          }

          // Merge SRS data: cloud wins for overlapping cards (it's newer)
          const currentSrs = useAppStore.getState().srsData;
          const currentLearned = useAppStore.getState().learnedCards;
          const mergedSrs = { ...currentSrs, ...cloudData.srsData };
          const mergedLearned = Array.from(
            new Set([...currentLearned, ...cloudData.learnedCards])
          );
          setSrsDataAndLearnedCards(mergedSrs, mergedLearned);
        }
      }

      // 2. Fetch aggregate stats (streak, total XP, etc.)
      const aggregateStats = await progressService.getAggregateStats(currentUser.id);
      if (aggregateStats) {
        setProgressStats({
          currentStreak: aggregateStats.currentStreak,
          longestStreak: aggregateStats.longestStreak,
          totalXp: aggregateStats.totalXp,
          totalCardsReviewed: aggregateStats.totalCardsReviewed,
          totalCardsLearned: aggregateStats.totalCardsLearned,
          lastStudyDate: aggregateStats.lastStudyDate,
        });
      }

      // 3. Fetch custom folders from user_folders table
      const { data: foldersData, error: foldersError } = await supabase
        .from('user_folders')
        .select('id, name, color')
        .eq('user_id', currentUser.id);

      if (!foldersError && foldersData && foldersData.length > 0) {
        setCustomFolders(foldersData.map((f: any) => ({
          id: f.id,
          name: f.name,
          color: f.color,
        })));
      }

      hasFetchedForUser.current = currentUser.id;
      setSyncStatus('success');
    } catch (e: any) {
      console.error("Failed to fetch from cloud:", e);
      setSyncStatus('error');
      setSyncError(e?.message || 'Failed to sync from cloud');
    }
  }, [currentUser, setSyncStatus, setSyncError, setLastCloudUpdate, setSrsDataAndLearnedCards, setProgressStats, setCustomFolders]);

  // ── Save to cloud ─────────────────────────────────────────────────
  const saveToCloud = useCallback(
    async (isUnload = false) => {
      if (!currentUser) return;
      const store = useAppStore.getState();

      try {
        setSyncStatus('syncing');
        setSyncError(null);

        // 1. Sync card progress (granular rows)
        await userService.syncCardProgress(currentUser.id, store.srsData);

        // 2. Sync metadata (learned_cards, last_activity)
        await userService.syncMetadata(currentUser.id, {
          learnedCards: store.learnedCards,
          lastActivity: store.lastActivity,
        });

        // 3. Sync user_metadata (preferences, session state) via service layer
        const currentMeta = currentUser.user_metadata || {};
        const needMetaUpdate =
          JSON.stringify(currentMeta.favorites) !== JSON.stringify(store.favorites) ||
          currentMeta.activeBookId !== store.activeBookId ||
          currentMeta.characterPreference !== store.characterPreference ||
          JSON.stringify(currentMeta.sessionProgressIndex) !== JSON.stringify(store.sessionProgressIndex) ||
          currentMeta.activeTab !== store.activeTab ||
          currentMeta.activeActivity !== store.activeActivity ||
          JSON.stringify(currentMeta.selectedLessons) !== JSON.stringify(store.selectedLessons) ||
          JSON.stringify(currentMeta.selectedBooks) !== JSON.stringify(store.selectedBooks);

        if (needMetaUpdate) {
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

        // 4. Sync custom folders to user_folders table
        if (store.customFolders.length > 0) {
          const folderRows = store.customFolders.map((f: any) => ({
            id: f.id,
            user_id: currentUser.id,
            name: f.name,
            color: f.color,
          }));
          await supabase
            .from('user_folders')
            .upsert(folderRows, { onConflict: 'id' });
        }

        // 5. Update aggregate stats from cloud after saving
        const aggregateStats = await progressService.getAggregateStats(currentUser.id);
        if (aggregateStats) {
          setProgressStats({
            currentStreak: aggregateStats.currentStreak,
            longestStreak: aggregateStats.longestStreak,
            totalXp: aggregateStats.totalXp,
            totalCardsReviewed: aggregateStats.totalCardsReviewed,
            totalCardsLearned: aggregateStats.totalCardsLearned,
            lastStudyDate: aggregateStats.lastStudyDate,
          });
        }

        setLastCloudUpdate(new Date().toISOString());
        setSyncStatus('success');
      } catch (e: any) {
        console.error("Failed to sync to cloud:", e);
        setSyncStatus('error');
        setSyncError(e?.message || 'Failed to save to cloud');
      }
    },
    [currentUser, setSyncStatus, setSyncError, setLastCloudUpdate, setProgressStats]
  );

  // ── Sync daily progress when session cards reviewed changes ───────
  useEffect(() => {
    if (!currentUser || isInitialLoad.current) return;

    const currentCount = sessionProgress.cardsReviewed;
    const newReviews = currentCount - lastDailySyncCount.current;

    if (newReviews > 0 && lastActivityType) {
      lastDailySyncCount.current = currentCount;

      let dailyActivity: 'flashcards' | 'quiz' | 'listening' | 'writing' | null = null;
      if (lastActivityType === 'flashcards' || lastActivityType === 'flashcards-review') {
        dailyActivity = 'flashcards';
      } else if (lastActivityType === 'quiz') {
        dailyActivity = 'quiz';
      } else if (lastActivityType === 'listening') {
        dailyActivity = 'listening';
      } else if (lastActivityType === 'writing') {
        dailyActivity = 'writing';
      }

      if (dailyActivity) {
        progressService.upsertDailyProgress(currentUser.id, {
          cardsReviewed: newReviews,
          activityType: dailyActivity,
          activityCount: newReviews,
        }).catch((e) => console.error('Daily progress sync failed:', e));
      }
    }
  }, [sessionProgress.cardsReviewed, currentUser, lastActivityType]);

  // ── Initial load & visibility/focus listeners ─────────────────────
  useEffect(() => {
    if (currentUser) {
      if (lastSyncedUserId.current !== currentUser.id) {
        lastSyncedUserId.current = currentUser.id;
        hasFetchedForUser.current = null;
        lastDailySyncCount.current = useAppStore.getState().sessionProgress.cardsReviewed;
        fetchFromCloud();
      }

      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          fetchFromCloud();
        } else if (document.visibilityState === 'hidden') {
          saveToCloud(true);
        }
      };

      const handleBlur = () => {
        saveToCloud(true);
      };

      window.addEventListener('blur', handleBlur);
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } else {
      lastSyncedUserId.current = null;
    }
  }, [currentUser, fetchFromCloud, saveToCloud]);

  // ── Beforeunload: best-effort save ────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      saveToCloud(true);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [saveToCloud]);

  // ── Debounced auto-save on state changes ──────────────────────────
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (currentUser && hasFetchedForUser.current === currentUser.id) {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);

      pendingSave.current = true;
      const delay = 10000 + saveBackoffMs.current;

      syncTimeout.current = setTimeout(async () => {
        if (isSaving.current) return;
        isSaving.current = true;
        try {
          await saveToCloud();
          saveBackoffMs.current = 0;
        } catch (e: any) {
          console.error("Auto-save failed:", e);
          if (e?.message?.includes('rate limit') || e?.status === 429) {
            saveBackoffMs.current = Math.min(saveBackoffMs.current + 15000, 60000);
          }
        } finally {
          isSaving.current = false;
          if (pendingSave.current) {
            pendingSave.current = false;
          }
        }
      }, delay);
    }

    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, [
    srsData,
    learnedCards,
    favorites,
    activeBookId,
    characterPreference,
    customFolders,
    currentUser,
    saveToCloud,
  ]);
}