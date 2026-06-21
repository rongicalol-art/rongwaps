import { isSupabaseConfigured, supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const missingSupabaseMessage = 'Supabase is not configured for this local environment.';

export const authService = {
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
      console.error("Login failed", error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!isSupabaseConfigured()) {
      console.warn(missingSupabaseMessage);
      callback(null);
      return () => {};
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      callback(session?.user ?? null);
    }).catch((error) => {
      console.error("Session check failed", error);
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

  upsertProfile: async (user: User): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) return;
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      console.error("Failed to upsert profile:", error);
      throw error;
    }
  },

  refreshSession: async (): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) return;
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      throw error;
    }
  },

  /**
   * Update user metadata in Supabase auth.
   * Used by useCloudSync to persist preferences to user_metadata for cross-device sync.
   */
  updateUserMetadata: async (metadata: Record<string, any>): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) return;
      const { error } = await supabase.auth.updateUser({ data: metadata });
      if (error) throw error;
    } catch (error) {
      console.error("Failed to update user metadata:", error);
      throw error;
    }
  }
};