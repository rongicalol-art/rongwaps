import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { folderCollabService, type FolderMember } from '../../../services/folderCollabService';
import { userService } from '../../../services/userService';
import { flashcardService } from '../../../services/flashcardService';
import { shareFolderLink } from '../../../utils/browser/shareLink';
import { isFolderOwner } from '../../../utils/vocabulary/folderCollaboration';

export function useFolderCollaboration(activeView: string, activeFolderId: string) {
  const user = useAppStore((state) => state.currentUser);
  const userId = user?.id;
  const folders = useAppStore((state) => state.customFolders);
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const shareFolder = folders.find((folder) => folder.id === shareFolderId);
  const targetId = shareFolderId ?? (activeView === 'folder' && (activeFolder?.memberCount ?? 0) > 1 ? activeFolderId : null);
  const [result, setResult] = useState<{ folderId: string; userId: string; members: FolderMember[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!targetId || !userId) return;
    let cancelled = false;
    setError(null);
    setResult(null);
    folderCollabService.listMembers(targetId).then((members) => {
      if (!cancelled) setResult({ folderId: targetId, userId, members });
    }).catch(() => { if (!cancelled) setError('Could not load people. Please try again.'); });
    return () => { cancelled = true; };
  }, [targetId, userId, revision]);

  const refreshFolder = activeView === 'folder' && Boolean(activeFolder && ((activeFolder.memberCount ?? 0) > 1 || !isFolderOwner(activeFolder)));
  useEffect(() => {
    if (refreshFolder && userId) {
      void flashcardService.refetchFolderFlashcards(userId, activeFolderId);
    }
  }, [refreshFolder, activeFolderId, userId]);

  const invite = useCallback(async (): Promise<boolean> => {
    if (!shareFolder || !user || flight.current) return false;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      const code = shareFolder.inviteCode ?? await folderCollabService.createInvite(shareFolder.id);
      const store = useAppStore.getState();
      if (store.currentUser?.id !== user.id) return false;
      // Cache a confirmed creation even if sharing is cancelled or copying fails.
      if (!shareFolder.inviteCode) {
        store.setCustomFolders(store.customFolders.map((folder) => folder.id === shareFolder.id ? { ...folder, inviteCode: code } : folder));
      }
      return await shareFolderLink(shareFolder.name, `/join/${code}`);
    } catch { setError('Could not share this link. Please try again.'); return false; }
    finally { flight.current = false; setBusy(false); }
  }, [shareFolder, user]);

  const changeMembers = async (operation: () => Promise<void>) => {
    if (!shareFolderId || !user || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      await operation();
      const fresh = await userService.getFolders();
      if (useAppStore.getState().currentUser?.id !== user.id) return;
      useAppStore.getState().setCustomFolders(fresh);
      setRevision((value) => value + 1);
    } catch { setError('Could not update sharing. Please try again.'); }
    finally { flight.current = false; setBusy(false); }
  };

  return {
    activeFolder, shareFolder, setShareFolderId, invite, busy, error,
    removeMember: (userId: string) => changeMembers(() => folderCollabService.removeMember(shareFolderId!, userId)),
    setRole: (userId: string, role: 'viewer' | 'editor') => changeMembers(() => folderCollabService.setRole(shareFolderId!, userId, role)),
    retry: () => setRevision((value) => value + 1),
    members: result?.folderId === targetId && result.userId === userId ? result.members : null,
  };
}
