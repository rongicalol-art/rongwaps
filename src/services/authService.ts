import { debugLogger } from '../utils/debug/debugLogger';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const missingSupabaseMessage = 'Supabase is not configured for this local environment.';

export const authService = {
  /** Access token for authenticated API calls, or null when signed out. */
  getAccessToken: async (): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  loginWithGoogle: async (): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(`${missingSupabaseMessage} Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable sign-in.`);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
        }
      });
      if (error) throw error;
    } catch (error) {
      debugLogger.error('Auth', "Login failed", error);
      throw error;
    }
  },

  /** `local` only drops this device's session (no server call), e.g. after the account is deleted. */
  logout: async (scope: 'global' | 'local' = 'global'): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) return;
      const { error } = await supabase.auth.signOut({ scope });
      if (error) throw error;
    } catch (error) {
      debugLogger.error('Auth', "Logout failed", error);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!isSupabaseConfigured()) {
      debugLogger.warn('Auth', missingSupabaseMessage);
      callback(null);
      return () => {};
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      callback(session?.user ?? null);
    }).catch((error) => {
      debugLogger.error('Auth', "Session check failed", error);
      callback(null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (!isSupabaseConfigured()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  },

  refreshSession: async (): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) return;
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
    } catch (error) {
      debugLogger.error('Auth', "Failed to refresh session:", error);
      throw error;
    }
  }
};
