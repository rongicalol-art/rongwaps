import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { folderCollabService, type FolderInvite } from '../../../services/folderCollabService';
import { flashcardService } from '../../../services/flashcardService';
import { userService } from '../../../services/userService';
import { useUserFlashcards } from '../../../features/library';
import { useAppStore } from '../../../store/useAppStore';
import { parseFolderLinkPath } from '../../../utils/browser/folderLinkPath';

export function useJoinFolder(code: string) {
  const navigate = useNavigate();
  useUserFlashcards();
  const user = useAppStore((state) => state.currentUser);
  const [folder, setFolder] = useState<FolderInvite | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const flight = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setState('loading');
    setFolder(null);
    setError(null);
    if (!parseFolderLinkPath(`/join/${code}`)) { setState('missing'); return; }
    folderCollabService.getInvite(code).then((preview) => {
      if (cancelled) return;
      setFolder(preview);
      setState(preview ? 'ready' : 'missing');
    }).catch(() => { if (!cancelled) { setState('error'); setError('Check your connection and try again.'); } });
    return () => { cancelled = true; };
  }, [code, user, revision]);

  const join = useCallback(async () => {
    if (!folder || !user || flight.current) return;
    flight.current = true;
    setJoining(true);
    setError(null);
    try {
      // Call even for existing members: validates rotation/deletion and is idempotent.
      const id = await folderCollabService.join(code);
      const fresh = await userService.getFolders();
      await flashcardService.refetchFlashcards(user.id);
      const store = useAppStore.getState();
      if (store.currentUser?.id !== user.id) return;
      store.setCustomFolders(fresh);
      store.setFoldersSyncedUserId(user.id);
      store.setLibraryActiveFolder(id);
      store.setLibraryActiveView('folder');
      navigate('/library');
    } catch (failure) {
      const message = failure instanceof Error ? failure.message
        : typeof failure === 'object' && failure && 'message' in failure ? String(failure.message) : 'Could not join this folder. Please try again.';
      if (message.includes('Invite link is no longer valid')) setState('missing');
      else setError(message);
    } finally { flight.current = false; setJoining(false); }
  }, [folder, user, code, navigate]);

  return { folder, state, error, joining, join, retry: () => setRevision((value) => value + 1) };
}
