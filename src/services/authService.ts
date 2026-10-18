import { debugLogger } from '../utils/debug/debugLogger';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { type Session, type User } from '@supabase/supabase-js';

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

  if (details.includes('school_beta_only')) {
    return 'This beta is for Shu-Te student Google accounts. Use your s…@stu.edu.tw account.';
  }

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
          // Request the verified organization claim used by the database gate.
          scopes: 'openid email profile',
          queryParams: { prompt: 'select_account' },
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

  onAuthStateChanged: (callback: (user: User | null, hasFullCourseAccess: boolean) => void) => {
    if (!isSupabaseConfigured()) {
      debugLogger.warn('Auth', missingSupabaseMessage);
      callback(null, false);
      return () => {};
    }
    let revision = 0;
    let disposed = false;
    let pendingCheck: ReturnType<typeof setTimeout> | undefined;
    const notify = async (session: Session | null, expectedRevision: number) => {
      if (disposed || expectedRevision !== revision) return;
      if (!session) { callback(null, false); return; }
      try {
        const { data, error, status } = await supabase.rpc('has_beta_access');
        if (disposed || expectedRevision !== revision) return;
        if ((!error && data !== true) || status === 403 || status === 401) {
          callback(null, false);
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
        if (error) {
          callback(null, false);
          debugLogger.error('Auth', 'Beta access verification failed', error.code);
          return;
        }

        let hasFullCourseAccess = false;
        try {
          const { data: fullCourseAccess, error: fullCourseError } = await supabase.rpc('has_full_course_access');
          if (disposed || expectedRevision !== revision) return;
          hasFullCourseAccess = !fullCourseError && fullCourseAccess === true;
          if (fullCourseError) debugLogger.error('Auth', 'Full-course access verification failed', fullCourseError.code);
        } catch (accessError) {
          debugLogger.error('Auth', 'Full-course access verification unavailable', accessError);
        }
        if (!disposed && expectedRevision === revision) callback(session.user, hasFullCourseAccess);
      } catch (error) {
        if (!disposed && expectedRevision === revision) callback(null, false);
        debugLogger.error('Auth', 'Beta access verification unavailable', error);
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (revision === 0) void notify(session, ++revision);
    }).catch((error) => {
      if (!disposed && revision === 0) callback(null, false);
      debugLogger.error('Auth', 'Session check failed', error);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const expectedRevision = ++revision;
      clearTimeout(pendingCheck);
      // Supabase operations must run after the auth callback releases its lock.
      pendingCheck = setTimeout(() => { void notify(session, expectedRevision); }, 0);
    });
    return () => {
      disposed = true;
      revision++;
      clearTimeout(pendingCheck);
      subscription.unsubscribe();
    };
  },

};
