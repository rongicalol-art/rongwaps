import { parseFolderLinkPath } from './folderLinkPath';
import { useAppStore } from '../../store/useAppStore';

export const PENDING_FOLDER_KEY = 'pendingFolderPath';

// Storage can throw in private mode or when site data is blocked.
export function rememberFolderReturn(path: string): void {
  if (!parseFolderLinkPath(path)) return;
  try { sessionStorage.setItem(PENDING_FOLDER_KEY, path); } catch { /* ignore */ }
}
export function takeFolderReturn(): string | null {
  let path: string | null = null;
  try {
    path = sessionStorage.getItem(PENDING_FOLDER_KEY);
    sessionStorage.removeItem(PENDING_FOLDER_KEY);
  } catch { /* ignore */ }
  return parseFolderLinkPath(path);
}
export async function shareFolderLink(title: string, path: string): Promise<boolean> {
  if (!parseFolderLinkPath(path)) throw new Error('Invalid folder link');
  const url = `${window.location.origin}${path}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    useAppStore.getState().showFeedbackToast('Could not copy the folder link', 'neutral', 2500);
    return false;
  }
}
