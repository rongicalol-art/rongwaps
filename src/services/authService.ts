import { debugLogger } from '../utils/debug/debugLogger';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { type Session, type User } from '@supabase/supabase-js';
import { schoolAccessFromClaims, unverifiedClaims } from '../../shared/accessToken';
import { SIGNUP_OPEN_AT } from '../../shared/publicLaunch';

const missingSupabaseMessage = 'Supabase is not configured for this local environment.';
const productionAuthRedirectUrl = 'https://ronsmandarin.com/';

export function getOAuthRedirectUrl(
  origin: string,
  isProduction: boolean,
  configuredUrl: string | undefined = import.meta.env?.VITE_AUTH_REDIRECT_URL,
): string {
  if (!isProduction) return new URL('/', origin).toString();
  const redirect = new URL(configuredUrl || productionAuthRedirectUrl);
  if (redirect.protocol !== 'https:' || redirect.username || redirect.password) {
    throw new Error('VITE_AUTH_REDIRECT_URL must be an HTTPS app address.');
  }
  return new URL('/', redirect).toString();
}

const SIGNUPS_OFF = /signup_disabled|signups? (are )?not allowed/;

/** Learners see the plain message; local builds also name the dashboard setting to fix. */
function setupMessage(message: string, devHint: string, hints = Boolean(import.meta.env?.DEV)): string {
  return hints ? `${message} ${devHint}` : message;
}
const UNAVAILABLE = 'Sign-in isn’t available right now. Please try again later.';
const signupsOffMessage = (hints?: boolean) => setupMessage('New accounts can’t be created right now. Please try again later.', 'Supabase: Authentication → Sign In / Providers → Allow new users to sign up.', hints);
const redirectMessage = (hints?: boolean) => setupMessage(UNAVAILABLE, `Supabase blocked this return address: add ${getOAuthRedirectUrl(productionAuthRedirectUrl, true)} to Authentication → URL Configuration → Redirect URLs.`, hints);
const providerMessage = (hints?: boolean) => setupMessage(UNAVAILABLE, 'Google sign-in is not enabled for this Supabase project: Authentication → Sign In / Providers.', hints);

/** Sign-in closed: school-only before sign-up opens to everyone; after it, the owner's pause. */
export function closedSignInMessage(now = Date.now()): string {
  return now < SIGNUP_OPEN_AT
    ? 'This beta is for Shu-Te student Google accounts. Use your s…@stu.edu.tw account.'
    : 'Ron’s Mandarin is closed to new sign-ins for now. Please try again later.';
}

/** Not an error: the database's public sign-up cap is reached (private.signup_settings.public_cap). */
export const SIGNUPS_FULL_MESSAGE = 'Ron’s Mandarin is full for now. New places open soon, so try again in a few days.';

export function getOAuthCallbackErrorMessage(search: string, hash: string, hints?: boolean): string | null {
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

  if (details.includes('signups_full')) return SIGNUPS_FULL_MESSAGE;
  if (details.includes('account_blocked')) return 'This account can’t sign in.';
  if (details.includes('google_only')) return 'Sign in with a Google account whose email is verified.';
  if (details.includes('school_beta_only')) return closedSignInMessage();

  if (errorCode === 'access_denied') {
    return 'Google sign-in was cancelled. Try again when you’re ready.';
  }
  // Before the redirect check: "Signups not allowed for this instance" also says "not allowed".
  if (SIGNUPS_OFF.test(details)) return signupsOffMessage(hints);
  if (/redirect|allow.?list|not allowed/.test(details)) return redirectMessage(hints);
  if (/provider|google/.test(details)) return providerMessage(hints);
  if (/cancel|denied/.test(details)) {
    return 'Google sign-in was cancelled. Try again when you’re ready.';
  }
  return 'Google sign-in could not finish. Please try again.';
}

export function getOAuthLoginErrorMessage(error: unknown, hints?: boolean): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('supabase is not configured')) {
    return setupMessage(UNAVAILABLE, 'Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set for this build.', hints);
  }
  if (SIGNUPS_OFF.test(message)) return signupsOffMessage(hints);
  if (/redirect|allow.?list|not allowed/.test(message)) return redirectMessage(hints);
  if (/provider|google/.test(message)) return providerMessage(hints);
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

  /** The caller's own "I'm 18 or older", then a fresh token so its `age_ok` claim (and the app) follow. */
  confirmAge: async (): Promise<void> => {
    const { error } = await supabase.rpc('confirm_age');
    if (error) throw error;
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
  },

  /** `ageOk` is false only for a public account that has not passed the age step yet. */
  onAuthStateChanged: (callback: (user: User | null, hasFullCourseAccess: boolean, ageOk?: boolean) => void) => {
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
      // Tokens issued by the school sign-in hook already carry its decision; older ones ask the database.
      const stamped = schoolAccessFromClaims(unverifiedClaims(session.access_token));
      if (stamped) { callback(session.user, stamped.fullCourse, stamped.ageOk); return; }
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
