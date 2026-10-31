import { isFolderOwner } from '../utils/vocabulary/folderCollaboration';
import { useCallback, useRef, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import type { SRSData } from '../utils/srs/srsEngine';
import { debugLogger } from '../utils/debug/debugLogger';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';
import { flashcardService } from '../services/flashcardService';
import {
  applyProgressResetEpoch,
  checkpointForUser,
  isSameFolderList,
  mergePulledSrsData,
} from '../utils/sync/cloudSyncQueue';
import {
  mergeGrammarProgress,
  resolveCloudMetadataPatch,
  resolveGuestFolderMigration,
} from '../utils/sync/cloudMetadata';

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
  const requestRevisionRef = useRef(0);
  const fetchFromCloud = useCallback(async () => {
    const sessionUser = useAppStore.getState().currentUser;
    if (!currentUser || sessionUser?.id !== currentUser.id) return false;
    const revision = ++requestRevisionRef.current;
    const isCurrent = () => useAppStore.getState().currentUser === sessionUser
      && revision === requestRevisionRef.current;
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
      // The cleared local state now belongs to this account, even if its
      // first pull fails. Retrying must not clear its new local reviews again.
      activeUserIdRef.current = currentUser.id;

      let srsAtPullStart = useAppStore.getState().srsData;
      const lastCursor = checkpointForUser(useAppStore.getState().syncCheckpoint, currentUser.id)?.cursor ?? null;
      const authorization = await userService.getSyncAuthorization(currentUser.id);
      if (!isCurrent()) return false;
      let cloudData = await userService.getSyncState({ since: lastCursor ?? undefined, authorization });
      if (!isCurrent()) return false;

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
        useAppStore.getState().resetGrammarProgress();
        // Nothing local is known to be on the server any more.
        setSyncCheckpoint({ userId: currentUser.id, cursor: null, srs: {} });
        // An incremental pull omits rows older than the cursor, which the wipe
        // just dropped locally: refetch everything.
        srsAtPullStart = epoch.srsData;
        if (lastCursor) cloudData = await userService.getSyncState({ authorization });
        if (!isCurrent()) return false;
      }
      const resetToRemember = epoch ? epoch.seenResetAt : cloudData.progressResetAt;
      if (resetToRemember && resetToRemember !== seenReset) {
        useAppStore.getState().setProgressResetSeen(currentUser.id, resetToRemember);
      }
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

      const grammarPatch = mergeGrammarProgress(cloudData.settings, useAppStore.getState());
      if (Object.keys(grammarPatch).length > 0) useAppStore.setState(grammarPatch);

      useAppStore.getState().mergeReviewHistory(
        cloudData.reviewEvents,
        epoch?.wiped && cloudData.progressResetAt ? new Date(cloudData.progressResetAt).getTime() : 0,
      );
      lastSyncedSettingsRef.current = cloudData.settings;

      // Folder writes go straight through flashcardService, so the pull is
      // the server truth. Guest folders created before the first sign-in are
      // uploaded once.
      const guestFolders = resolveGuestFolderMigration({
        isAccountSwitch,
        prePullFolders: prePullFolders.filter((folder) => isFolderOwner(folder) && (!folder.ownerId || folder.ownerId === currentUser.id)),
        prePullFolderOwner,
        serverFolders: cloudData.folders,
      });
      if (guestFolders.length > 0) {
        await flashcardService.importFolders(currentUser.id, guestFolders);
        if (!isCurrent()) return false;
      }
      const folders = guestFolders.length > 0 ? await userService.getFolders() : cloudData.folders;
      if (!isCurrent()) return false;
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
      return true;
    } catch (error: unknown) {
      if (!isCurrent()) return false;
      debugLogger.error('Sync', 'Failed to fetch from cloud:', error);
      setSyncStatus('error');
      setSyncError("Couldn't load your latest progress. Check your connection — we'll retry.");
      return false;
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
