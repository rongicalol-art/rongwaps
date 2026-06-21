import { useSyncExternalStore, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { useAppStore, UserSnapshot } from '../store/useAppStore';

let globalUser: User | null = null;
let globalIsLoading = true;
const listeners = new Set<() => void>();

function userToSnapshot(user: User | null): UserSnapshot | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  };
}

let unsubscribeAuth: (() => void) | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (listeners.size === 1 && !unsubscribeAuth) {
    unsubscribeAuth = authService.onAuthStateChanged((user) => {
      globalUser = user;
      globalIsLoading = false;
      const snapshot = userToSnapshot(user);
      useAppStore.getState().setCurrentUser(snapshot);
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
  const currentUser = useSyncExternalStore(subscribe, () => globalUser);
  const storeUser = useAppStore((state) => state.currentUser);
  const initialLoading = useSyncExternalStore(subscribe, () => globalIsLoading);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      authService.upsertProfile(currentUser).catch(err => {
        console.warn("Profile upsert failed (non-critical):", err);
      });
    }
  }, [currentUser?.id]);

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
      await authService.logout();
    } finally {
      setIsAuthActionLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setIsAuthActionLoading(true);
    try {
      await authService.refreshSession();
    } finally {
      setIsAuthActionLoading(false);
    }
  }, []);

  return {
    currentUser,
    userSnapshot: storeUser,
    isLoading: initialLoading,
    isAuthActionLoading,
    loginWithGoogle,
    logout,
    refreshSession,
  };
}