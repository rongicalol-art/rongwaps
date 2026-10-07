import { useCallback, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import type { SRSData } from '../utils/srsEngine';
import { debugLogger } from '../utils/debugLogger';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { flashcardService } from '../services/flashcardService';
import {
  applyProgressResetEpoch,
  checkpointForUser,
  isSameFolderList,
  mergePulledSrsData,
} from '../utils/cloudSyncQueue';
import {
  resolveCloudMetadataPatch,
  resolveGuestFolderMigration,
} from '../utils/cloudMetadata';

export interface UseCloudSyncFetchOptions {
  currentUser: User | null;
  persistedOwnerRef: MutableRefObject<string | null>;
  lastSyncedSettingsRef: MutableRefObject<Record<string, unknown> | null>;
  hasFetchedForUserRef: MutableRefObject<string | null>;
  activeUserIdRef: MutableRefObject<string | null>;
}

export function useCloudSyncFetch({
  currentUser,
  persistedOwnerRef,
  lastSyncedSettingsRef,
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
      setSyncCheckpoint,
      setCustomFolders,
      setFoldersSyncedUserId,
    } = useAppStore.getState();

    try {
      setSyncStatus('syncing');

      const prePullFolders = useAppStore.getState().customFolders;
      const prePullFolderOwner = useAppStore.getState().foldersSyncedUserId;

      const isAccountSwitch =
        (activeUserIdRef.current !== null && activeUserIdRef.current !== currentUser.id)
        || (persistedOwnerRef.current !== null && persistedOwnerRef.current !== currentUser.id);

      // Clears the persisted checkpoint too, so a switch is always a full pull.
      if (isAccountSwitch) useAppStore.getState().resetAccountScopedState();

      useAppStore.setState({ lastActiveUserId: currentUser.id });
      persistedOwnerRef.current = currentUser.id;

      const lastCursor = checkpointForUser(useAppStore.getState().syncCheckpoint, currentUser.id)?.cursor ?? null;
      let cloudData = await userService.getSyncState(
        lastCursor ? { since: lastCursor } : undefined,
      );

      // A reset performed on another device wipes this device's progress
      // BEFORE it is merged or pushed; otherwise the stale local copy would be
      // re-uploaded and resurrect what the reset deleted.
      const seenReset = useAppStore.getState().progressResetSeen[currentUser.id];
      const epoch = isAccountSwitch
        ? null
        : applyProgressResetEpoch({
          srsData: useAppStore.getState().srsData,
          learnedCards: useAppStore.getState().learnedCards,
          cloudResetAt: cloudData.progressResetAt,
          seenResetAt: seenReset,
        });
      if (epoch?.wiped) {
        setSrsDataAndLearnedCards(epoch.srsData, epoch.learnedCards);
        // Nothing local is known to be on the server any more.
        setSyncCheckpoint({ userId: currentUser.id, cursor: null, srs: {} });
        // An incremental pull omits rows older than the cursor, which the wipe
        // just dropped locally: refetch everything.
        if (lastCursor) cloudData = await userService.getSyncState();
      }
      const resetToRemember = epoch ? epoch.seenResetAt : cloudData.progressResetAt;
      if (resetToRemember && resetToRemember !== seenReset) {
        useAppStore.getState().setProgressResetSeen(currentUser.id, resetToRemember);
      }
      const srsAtPullStart = useAppStore.getState().srsData;
      let baselineAfterPull: Record<string, SRSData> | null = null;

      const cloudTime = cloudData.lastUpdated ? new Date(cloudData.lastUpdated).getTime() : 0;
      const localLastUpdate = useAppStore.getState().lastCloudUpdate;
      const localTime = localLastUpdate ? new Date(localLastUpdate).getTime() : 0;

      if (isAccountSwitch || cloudData.hasDelta || cloudTime > localTime) {
        const metadataIsNewer = isAccountSwitch || cloudTime > localTime;

        if (metadataIsNewer) {
          setLastCloudUpdate(cloudData.lastUpdated || null);
          const local = useAppStore.getState();
          const patch = resolveCloudMetadataPatch(
            cloudData.settings,
            {
              activeBookId: local.activeBookId,
              selectedLessonParts: local.selectedLessonParts,
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
          baselineAfterPull = cloudData.srsData;
        } else {
          const { merged, baseline } = mergePulledSrsData({
            priorBaseline: checkpointForUser(localProgress.syncCheckpoint, currentUser.id)?.srs ?? null,
            atPullStart: srsAtPullStart,
            current: localProgress.srsData,
            cloud: cloudData.srsData,
          });
          setSrsDataAndLearnedCards(
            merged,
            Array.from(new Set([...localProgress.learnedCards, ...cloudData.learnedCards])),
          );
          baselineAfterPull = baseline;
        }
      }

      lastSyncedSettingsRef.current = cloudData.settings;

      // Folder writes go straight through flashcardService, so the pull is
      // the server truth. Guest folders created before the first sign-in are
      // uploaded once.
      const guestFolders = resolveGuestFolderMigration({
        isAccountSwitch,
        prePullFolders,
        prePullFolderOwner,
        serverFolders: cloudData.folders,
      });
      if (guestFolders.length > 0) {
        await flashcardService.importFolders(currentUser.id, guestFolders);
      }
      const folders = guestFolders.length > 0 ? guestFolders : cloudData.folders;
      if (!isSameFolderList(useAppStore.getState().customFolders, folders)) {
        setCustomFolders(folders);
      }
      if (useAppStore.getState().foldersSyncedUserId !== currentUser.id) {
        setFoldersSyncedUserId(currentUser.id);
      }

      hasFetchedForUserRef.current = currentUser.id;
      activeUserIdRef.current = currentUser.id;
      // Remember where this pull left off (cursor + upload baseline); persisted,
      // so a cold load pulls only what changed since.
      const checkpoint = checkpointForUser(useAppStore.getState().syncCheckpoint, currentUser.id);
      setSyncCheckpoint({
        userId: currentUser.id,
        cursor: cloudData.cursor ?? checkpoint?.cursor ?? null,
        srs: baselineAfterPull ?? checkpoint?.srs ?? {},
      });
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
    lastSyncedSettingsRef,
    persistedOwnerRef,
  ]);

  return { fetchFromCloud };
}
