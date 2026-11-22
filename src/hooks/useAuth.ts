import { useSyncExternalStore, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { useAppStore, UserSnapshot } from '../store/useAppStore';
import { saveToCloudNow } from '../utils/sync/cloudSaveNow';

let globalUser: User | null = null;
let globalHasFullCourseAccess = false;
let globalNeedsAgeCheck = false;
let globalIsLoading = true;
const listeners = new Set<() => void>();

// Safety net: if Supabase never responds, stop blocking the app after 3s
const loadingTimeout = setTimeout(() => {
  if (globalIsLoading) {
    globalIsLoading = false;
    listeners.forEach(listener => listener());
  }
}, 3000);

function userToSnapshot(user: User | null): UserSnapshot | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    createdAt: user.created_at,
  };
}

let unsubscribeAuth: (() => void) | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (listeners.size === 1 && !unsubscribeAuth) {
    unsubscribeAuth = authService.onAuthStateChanged((user, hasFullCourseAccess, ageOk = true) => {
      clearTimeout(loadingTimeout);
      const snapshot = userToSnapshot(user);
      const previous = useAppStore.getState().currentUser;
      // The sign-in library announces the same session again on every return to the tab and token refresh,
      // each time as a new object. Keep the objects we have unless the account or what we show of it changed,
      // so sync and the screens that depend on the user are not restarted for nothing.
      const sameUser = Boolean(globalUser && snapshot && previous && globalUser.id === snapshot.id
        && JSON.stringify(previous) === JSON.stringify(snapshot));
      if (!sameUser) globalUser = user;
      globalHasFullCourseAccess = Boolean(user && hasFullCourseAccess);
      globalNeedsAgeCheck = Boolean(user && !ageOk);
      globalIsLoading = false;
      if (!sameUser) useAppStore.getState().setCurrentUser(snapshot);
      listeners.forEach(listener => listener());
    });
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && unsubscribeAuth) {
      unsubscribeAuth();
      unsubscribeAuth = null;
    }
  };
}

export function useAuth() {
  const currentUser = useSyncExternalStore(subscribe, () => globalUser, () => globalUser);
  const hasFullCourseAccess = useSyncExternalStore(subscribe, () => globalHasFullCourseAccess, () => globalHasFullCourseAccess);
  const initialLoading = useSyncExternalStore(subscribe, () => globalIsLoading, () => globalIsLoading);
  /** A public account signed in but not past the age step: the app shows the age step instead of the workspace. */
  const needsAgeCheck = useSyncExternalStore(subscribe, () => globalNeedsAgeCheck, () => globalNeedsAgeCheck);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  const loginWithGoogle = useCallback(async () => {
    setIsAuthActionLoading(true);
    try {
      await authService.loginWithGoogle();
    } finally {
      setIsAuthActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsAuthActionLoading(true);
    try {
      await saveToCloudNow();
      await authService.logout();
      // The next sign-in starts from a full pull; the baseline is not trusted across sessions.
      useAppStore.getState().setSyncCheckpoint(null);
    } finally {
      setIsAuthActionLoading(false);
    }
  }, []);

  return {
    currentUser,
    hasFullCourseAccess,
    needsAgeCheck,
    isLoading: initialLoading,
    isAuthActionLoading,
    loginWithGoogle,
    logout,
  };
}
