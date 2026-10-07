import { useCallback } from 'react';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { useAppStore } from '../../store/useAppStore';
import { downloadJsonFile } from '../../utils/downloadFile';
import { debugLogger } from '../../utils/debugLogger';

/** Local calendar date as YYYY-MM-DD (en-CA), so the filename matches the user's day. */
function localDateStamp(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Account-level actions behind Settings → Account. Both reject on failure so
 * the calling dialog can show the error.
 */
export function useAccountActions() {
  const exportData = useCallback(async () => {
    const data = await userService.exportMyData();
    downloadJsonFile(`rongwaps-data-${localDateStamp()}.json`, data);
  }, []);

  /**
   * Deletes the account server-side, then drops everything cached for it on
   * this device and reloads into the sign-in screen. The reload also
   * discards in-memory sync state that still points at the deleted user.
   */
  const deleteAccount = useCallback(async () => {
    await userService.deleteMyAccount();

    try {
      // The user no longer exists server-side; only the local session is left to drop.
      await authService.logout('local');
    } catch (error) {
      debugLogger.warn('Auth', 'Local sign-out after account deletion failed:', error);
    }

    useAppStore.getState().resetAccountScopedState();
    useAppStore.setState({ lastActiveUserId: null, localFlashcards: [], progressResetSeen: {}, currentUser: null });
    await useAppStore.persist.clearStorage();
    window.location.replace('/');
  }, []);

  return { exportData, deleteAccount };
}
