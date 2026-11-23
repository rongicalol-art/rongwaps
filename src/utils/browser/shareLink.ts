import { parseFolderLinkPath } from './folderLinkPath';
import { useAppStore } from '../../store/useAppStore';
import { parseChallengePath } from '../../../shared/challengePath';

/** The key keeps its first name so a sign-in already underway when this shipped still comes back. */
export const PENDING_FOLDER_KEY = 'pendingFolderPath';

/** Only a folder invite or a challenge link may be returned to after Google sign-in. */
const returnPath = (path: string | null): string | null => parseFolderLinkPath(path) ?? (parseChallengePath(path) ? path : null);

/** Google sign-in always returns to the home address: remember the shared link that started it. */
// Storage can throw in private mode or when site data is blocked.
export function rememberLinkReturn(path: string): void {
  if (!returnPath(path)) return;
  try { sessionStorage.setItem(PENDING_FOLDER_KEY, path); } catch { /* ignore */ }
}
export function takeLinkReturn(): string | null {
  let path: string | null = null;
  try {
    path = sessionStorage.getItem(PENDING_FOLDER_KEY);
    sessionStorage.removeItem(PENDING_FOLDER_KEY);
  } catch { /* ignore */ }
  return returnPath(path);
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
