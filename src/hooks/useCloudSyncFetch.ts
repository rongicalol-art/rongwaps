import { useCallback, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import { debugLogger } from '../utils/debugLogger';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import type { SRSData } from '../utils/srsEngine';
import {
  isSameFolderList,
  mergePulledSrsData,
  pruneAcknowledgedTombstones,
  type SyncedFolderSnapshot,
  type SyncProgressCounters,
} from '../utils/cloudSyncQueue';
import {
  resolveCloudMetadataPatch,
  resolveGuestFolderMigration,
} from '../utils/cloudMetadata';
import { getProgressCounters } from '../utils/cloudSyncTransforms';

export interface UseCloudSyncFetchOptions {
  currentUser: User | null;
  persistedOwnerRef: MutableRefObject<string | null>;
  lastSyncedSrsRef: MutableRefObject<Record<string, SRSData> | null>;
  lastPulledCursorRef: MutableRefObject<{ userId: string; cursor: string | null } | null>;
  lastSyncedLearnedRef: MutableRefObject<string[] | null>;
  lastSyncedActivityRef: MutableRefObject<string | null>;
  lastSyncedFoldersRef: MutableRefObject<SyncedFolderSnapshot[] | null>;
  lastSyncedSessionRef: MutableRefObject<SyncProgressCounters>;
  hasFetchedForUserRef: MutableRefObject<string | null>;
  activeUserIdRef: MutableRefObject<string | null>;
}

export function useCloudSyncFetch({
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
}: UseCloudSyncFetchOptions) {
  const fetchFromCloud = useCallback(async () => {
    if (!currentUser) return;
    const {
      setSyncStatus,
      setSyncError,
      setLastCloudUpdate,
      setSrsDataAndLearnedCards,
      setCustomFolders,
      setDeletedFolderIds,
      setFoldersSyncedUserId,
    } = useAppStore.getState();

    try {
      setSyncStatus('syncing');

      const activeUser = await authService.getCurrentUser() || currentUser;
      const metadata = (activeUser.user_metadata || {}) as Record<string, unknown>;

      const prePullFolders = useAppStore.getState().customFolders;
      const prePullFolderOwner = useAppStore.getState().foldersSyncedUserId;
      const prePullTombstones = useAppStore.getState().deletedFolderIds;

      const isAccountSwitch =
        (activeUserIdRef.current !== null && activeUserIdRef.current !== currentUser.id)
        || (persistedOwnerRef.current !== null && persistedOwnerRef.current !== currentUser.id);

      if (isAccountSwitch) {
        lastPulledCursorRef.current = null;
        useAppStore.getState().resetAccountScopedState();
      }

      useAppStore.setState({ lastActiveUserId: currentUser.id });
      persistedOwnerRef.current = currentUser.id;

      const lastCursor = lastPulledCursorRef.current
        && lastPulledCursorRef.current.userId === currentUser.id
        ? lastPulledCursorRef.current.cursor
        : null;
      const cloudData = await userService.getProgress(
        currentUser.id,
        lastCursor ? { since: lastCursor } : undefined,
      );
      const srsAtPullStart = useAppStore.getState().srsData;

      if (cloudData) {
        const cloudTime = cloudData.lastUpdated ? new Date(cloudData.lastUpdated).getTime() : 0;
        const localLastUpdate = useAppStore.getState().lastCloudUpdate;
        const localTime = localLastUpdate ? new Date(localLastUpdate).getTime() : 0;

        if (isAccountSwitch || cloudData.hasCardDelta || cloudTime > localTime) {
          const metadataIsNewer = isAccountSwitch || cloudTime > localTime;

          if (metadataIsNewer) {
            setLastCloudUpdate(cloudData.lastUpdated || null);
            const local = useAppStore.getState();
            const patch = resolveCloudMetadataPatch(
              metadata,
              {
                activeBookId: local.activeBookId,
                selectedLessonParts: local.selectedLessonParts,
                sessionProgressIndex: local.sessionProgressIndex,
              },
              { isAccountSwitch },
            );
            if (Object.keys(patch).length > 0) {
              useAppStore.setState(patch);
            }
          }

          const localProgress = useAppStore.getState();
          if (isAccountSwitch) {
            setSrsDataAndLearnedCards(cloudData.srsData, cloudData.learnedCards);
            lastSyncedSrsRef.current = cloudData.srsData;
            lastSyncedLearnedRef.current = cloudData.learnedCards;
            lastSyncedActivityRef.current = cloudData.lastActivity ?? null;
          } else {
            const { merged, baseline } = mergePulledSrsData({
              priorBaseline: lastSyncedSrsRef.current,
              atPullStart: srsAtPullStart,
              current: localProgress.srsData,
              cloud: cloudData.srsData,
            });
            setSrsDataAndLearnedCards(
              merged,
              Array.from(new Set([...localProgress.learnedCards, ...cloudData.learnedCards])),
            );
            lastSyncedSrsRef.current = baseline;
          }
        }
      }

      if (isAccountSwitch) {
        lastSyncedSrsRef.current = cloudData?.srsData ?? null;
        lastSyncedLearnedRef.current = cloudData?.learnedCards ?? null;
        lastSyncedActivityRef.current = cloudData?.lastActivity ?? null;
      }

      const localFolders = useAppStore.getState().customFolders;
      const localFoldersDirty =
        lastSyncedFoldersRef.current !== null
        && !isSameFolderList(lastSyncedFoldersRef.current, localFolders);

      if (isAccountSwitch || !localFoldersDirty) {
        const folders = await userService.getCustomFolders(currentUser.id);
        setCustomFolders(folders);
        lastSyncedFoldersRef.current = folders;

        const migrated = resolveGuestFolderMigration({
          isAccountSwitch,
          prePullFolders,
          prePullFolderOwner,
          serverFolders: folders,
          tombstones: prePullTombstones,
        });
        if (migrated.length > 0) {
          await userService.syncCustomFolders(currentUser.id, migrated, []);
          setCustomFolders(migrated);
          lastSyncedFoldersRef.current = migrated;
        }

        if (!isAccountSwitch) {
          const serverFolderIds = folders.map((folder) => folder.id);
          const remaining = pruneAcknowledgedTombstones(
            useAppStore.getState().deletedFolderIds,
            serverFolderIds,
          );
          setDeletedFolderIds(remaining);
        }

        setFoldersSyncedUserId(currentUser.id);
      }

      lastSyncedSessionRef.current = getProgressCounters(useAppStore.getState());
      hasFetchedForUserRef.current = currentUser.id;
      activeUserIdRef.current = currentUser.id;
      if (cloudData?.serverLastUpdated) {
        lastPulledCursorRef.current = {
          userId: currentUser.id,
          cursor: cloudData.serverLastUpdated,
        };
      }
      setSyncStatus('success');
      setSyncError(null);
    } catch (error: unknown) {
      debugLogger.error('Sync', 'Failed to fetch from cloud:', error);
      setSyncStatus('error');
      setSyncError("Couldn't load your latest progress. Check your connection — we'll retry.");
    }
  }, [
    currentUser,
    activeUserIdRef,
    hasFetchedForUserRef,
    lastPulledCursorRef,
    lastSyncedActivityRef,
    lastSyncedFoldersRef,
    lastSyncedLearnedRef,
    lastSyncedSessionRef,
    lastSyncedSrsRef,
    persistedOwnerRef,
  ]);

  return { fetchFromCloud };
}
