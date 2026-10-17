import { debugLogger } from '../utils/debug/debugLogger';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const missingSupabaseMessage = 'Supabase is not configured for this local environment.';
const productionAuthRedirectUrl = 'https://ronsmandarin.com/';

export function getOAuthRedirectUrl(origin: string, isProduction: boolean): string {
  return isProduction ? productionAuthRedirectUrl : new URL('/', origin).toString();
}

export function getOAuthCallbackErrorMessage(search: string, hash: string): string | null {
  const queryParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const errorCode = queryParams.get('error_code')
    ?? hashParams.get('error_code')
    ?? queryParams.get('error')
    ?? hashParams.get('error');

  if (!errorCode) return null;

  const details = [
    errorCode,
    queryParams.get('error_description'),
    hashParams.get('error_description'),
  ].filter(Boolean).join(' ').toLowerCase();

  if (errorCode === 'access_denied') {
    return 'Google sign-in was cancelled. Try again when you’re ready.';
  }
  if (/redirect|allow.?list|not allowed/.test(details)) {
    return 'Supabase blocked this return address. Add https://ronsmandarin.com/ to Authentication → URL Configuration → Redirect URLs.';
  }
  if (/provider|google/.test(details)) {
    return 'Google sign-in is not enabled for this Supabase project. Check Authentication → Sign In / Providers.';
  }
  if (/cancel|denied/.test(details)) {
    return 'Google sign-in was cancelled. Try again when you’re ready.';
  }
  return 'Google sign-in could not finish. Please try again.';
}

export function getOAuthLoginErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('supabase is not configured')) {
    return 'Sign-in is not configured. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set for this build.';
  }
  if (/redirect|allow.?list|not allowed/.test(message)) {
    return 'Supabase blocked this return address. Add https://ronsmandarin.com/ to Authentication → URL Configuration → Redirect URLs.';
  }
  if (/provider|google/.test(message)) {
    return 'Google sign-in is not enabled for this Supabase project. Check Authentication → Sign In / Providers.';
  }
  if (/network|fetch|offline|load failed/.test(message)) {
    return 'Could not reach the sign-in service. Check your connection and try again.';
  }
  return 'Google sign-in could not start. Please try again.';
}

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
          redirectTo: getOAuthRedirectUrl(window.location.origin, Boolean(import.meta.env?.PROD)),
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

};
