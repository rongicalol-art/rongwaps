import { parseFolderLinkPath } from './folderLinkPath';
import { useAppStore } from '../../store/useAppStore';

export const PENDING_SHARED_FOLDER_KEY = 'pendingFolderPath';

// Storage can throw in private mode or when site data is blocked.
export function rememberFolderReturn(path: string): void {
  if (!parseFolderLinkPath(path)) return;
  try { sessionStorage.setItem(PENDING_SHARED_FOLDER_KEY, path); } catch { /* ignore */ }
}
export function takeFolderReturn(): string | null {
  let path: string | null = null;
  try {
    path = sessionStorage.getItem(PENDING_SHARED_FOLDER_KEY);
    sessionStorage.removeItem(PENDING_SHARED_FOLDER_KEY);
  } catch { /* ignore */ }
  return parseFolderLinkPath(path);
}
export function rememberSharedFolderReturn(shareId: string): void {
  rememberFolderReturn(`/s/${shareId}`);
}

export async function shareFolderLink(title: string, shareIdOrPath: string): Promise<void> {
  const path = shareIdOrPath.startsWith('/') ? shareIdOrPath : `/s/${shareIdOrPath}`;
  if (!parseFolderLinkPath(path)) throw new Error('Invalid folder link');
  const url = `${window.location.origin}${path}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    useAppStore.getState().showFeedbackToast('Folder link copied', 'neutral', 2200);
  } catch {
    useAppStore.getState().showFeedbackToast('Could not copy the folder link', 'neutral', 2500);
  }
}
