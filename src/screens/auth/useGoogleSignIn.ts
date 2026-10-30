import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getOAuthCallbackErrorMessage, getOAuthLoginErrorMessage } from '../../services/authService';
import { debugLogger } from '../../utils/debug/debugLogger';

const OAUTH_ERROR_KEYS = ['error', 'error_code', 'error_description'];

/**
 * Google sign-in for signed-out screens: starts the OAuth redirect, and on return
 * shows the provider's error once and strips it from the address bar.
 */
export function useGoogleSignIn() {
  const { loginWithGoogle, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const callbackError = getOAuthCallbackErrorMessage(window.location.search, window.location.hash);
    if (!callbackError) return;
    setError(callbackError);

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasSearchError = OAUTH_ERROR_KEYS.some((key) => searchParams.has(key));
    const hasHashError = OAUTH_ERROR_KEYS.some((key) => hashParams.has(key));
    for (const key of OAUTH_ERROR_KEYS) {
      searchParams.delete(key);
      hashParams.delete(key);
    }
    const search = searchParams.size ? `?${searchParams.toString()}` : '';
    const hash = hasHashError ? (hashParams.size ? `#${hashParams.toString()}` : '') : window.location.hash;
    const remainingSearch = hasSearchError || searchParams.size ? search : window.location.search;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${remainingSearch}${hash}`);
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      // The auth listener in useAuth updates the store.
    } catch (cause: unknown) {
      debugLogger.error('Auth', 'Login failed', cause);
      setError(getOAuthLoginErrorMessage(cause));
      setIsSigningIn(false);
    }
  }, [loginWithGoogle]);

  return { signIn, error, isBusy: isSigningIn || isLoading, isSigningIn };
}
