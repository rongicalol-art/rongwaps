import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { folderCollabService, type FolderMember } from '../../../services/folderCollabService';
import { userService } from '../../../services/userService';
import { flashcardService } from '../../../services/flashcardService';
import { shareFolderLink } from '../../../utils/browser/shareLink';

export function useFolderCollaboration(activeView: string, activeFolderId: string) {
  const user = useAppStore((state) => state.currentUser);
  const folders = useAppStore((state) => state.customFolders);
  const [membersFolderId, setMembersFolderId] = useState<string | null>(null);
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const membersFolder = folders.find((folder) => folder.id === membersFolderId);
  const targetId = membersFolderId ?? (activeView === 'folder' && (activeFolder?.memberCount ?? 0) > 1 ? activeFolderId : null);
  const [result, setResult] = useState<{ folderId: string; members: FolderMember[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!targetId || !user) return;
    let cancelled = false;
    setError(null);
    setResult(null);
    folderCollabService.listMembers(targetId).then((members) => {
      if (!cancelled) setResult({ folderId: targetId, members });
    }).catch(() => { if (!cancelled) setError('Could not load members. Please try again.'); });
    return () => { cancelled = true; };
  }, [targetId, user, revision]);

  useEffect(() => {
    if (activeView === 'folder' && user && ((activeFolder?.memberCount ?? 0) > 1 || activeFolder?.role === 'editor')) {
      void flashcardService.refetchFolderFlashcards(user.id, activeFolderId);
    }
  }, [activeView, activeFolderId, activeFolder?.memberCount, activeFolder?.role, user]);

  const invite = useCallback(async (folderId: string, rotate = false) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder || !user) return;
    try {
      const code = !rotate && folder.inviteCode ? folder.inviteCode : await folderCollabService.createInvite(folderId);
      const fresh = await userService.getFolders();
      if (useAppStore.getState().currentUser?.id !== user.id) return;
      useAppStore.getState().setCustomFolders(fresh);
      await shareFolderLink(folder.name, `/join/${code}`);
    } catch {
      useAppStore.getState().showFeedbackToast('Could not create or share this invite link', 'neutral', 3000);
    }
  }, [folders, user]);

  const removeMember = async (userId: string) => {
    if (!membersFolderId || !user || busy) return;
    setBusy(true);
    setError(null);
    try {
      await folderCollabService.removeMember(membersFolderId, userId);
      const fresh = await userService.getFolders();
      if (useAppStore.getState().currentUser?.id !== user.id) return;
      useAppStore.getState().setCustomFolders(fresh);
      setRevision((value) => value + 1);
    } catch { setError('Could not remove this member. Please try again.'); }
    finally { setBusy(false); }
  };

  return {
    activeFolder, membersFolder, setMembersFolderId, invite, removeMember, busy, error,
    retry: () => setRevision((value) => value + 1),
    members: result?.folderId === targetId ? result.members : null,
  };
}
