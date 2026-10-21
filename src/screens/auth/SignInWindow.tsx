import { debugLogger } from '../../utils/debug/debugLogger';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { getOAuthCallbackErrorMessage, getOAuthLoginErrorMessage } from '../../services/authService';
import { LEGAL_ROUTES } from '../../app/routes';
import {
  ActionButton,
  AppIcon,
  BrandWordmark,
  Dialog,
  VideoBackground,
} from '../../lib/widgets';

/**
 * Split-screen sign-in window with the static welcome artwork. Accounts are required,
 * so it cannot be dismissed; it unmounts when a session appears.
 */
export function SignInWindow() {
  const { loginWithGoogle, isLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const callbackError = getOAuthCallbackErrorMessage(window.location.search, window.location.hash);
    if (!callbackError) return;

    setAuthError(callbackError);

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasSearchError = ['error', 'error_code', 'error_description'].some((key) => searchParams.has(key));
    const hasHashError = ['error', 'error_code', 'error_description'].some((key) => hashParams.has(key));
    for (const key of ['error', 'error_code', 'error_description']) {
      searchParams.delete(key);
      hashParams.delete(key);
    }
    const search = searchParams.size ? `?${searchParams.toString()}` : '';
    const hash = hasHashError ? (hashParams.size ? `#${hashParams.toString()}` : '') : window.location.hash;
    const remainingSearch = hasSearchError || searchParams.size ? search : window.location.search;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${remainingSearch}${hash}`);
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      // The auth listener in useAuth updates the store.
    } catch (error: unknown) {
      debugLogger.error('Auth', 'Login failed', error);
      setAuthError(getOAuthLoginErrorMessage(error));
      setIsSigningIn(false);
    }
  };

  return (
    <Dialog.Root open={true} zIndexClassName="z-auth">
      <Dialog.Backdrop closeOnClick={false} />
      <Dialog.Content
        size="3xl"
        depth="xl"
        ariaLabel="Sign in"
        closeOnEscape={false}
        className="p-0 overflow-hidden rounded-feature md:min-h-[460px] max-h-none"
      >
      <div className="relative flex w-full flex-col overflow-hidden md:flex-row md:min-h-[460px]">
        {/* Left column: Welcome artwork and copy */}
        <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden p-6 sm:p-8 md:min-h-[460px] md:w-1/2">
          <VideoBackground
            posterSrc="/videos/login-poster.webp"
            scrimClassName="bg-gradient-to-t from-ui-ink/85 via-ui-ink/40 to-ui-ink/60"
          />

          {/* Top brand indicator */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border-b-[length:var(--depth-sm)] border-ui-border bg-ui-surface/90 px-3.5 py-1.5 shadow-ambient-sm backdrop-blur-md">
              <BrandWordmark className="min-w-0" />
            </div>
          </div>

          {/* Welcoming value proposition */}
          <div className="relative z-10 mt-auto pt-6 text-white">
            <p className="text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl md:text-4xl">
              Welcome back!
            </p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-white/90 drop-shadow-sm sm:text-sm">
              Unlock your full journey — save progress, sync across devices, and access your library anywhere.
            </p>
          </div>
        </div>

        {/* Right column: Clean Sign In form */}
        <div className="relative flex flex-1 flex-col justify-between bg-ui-surface p-6 sm:p-8 md:p-10">
          {/* Centered Sign In form */}
          <div className="my-auto mx-auto w-full max-w-sm py-2">
            <h1 className="text-2xl font-black tracking-tight text-ui-ink-strong md:text-3xl">
              Sign In
            </h1>
            <p className="mt-1.5 text-sm font-bold text-ui-muted-strong">
              Use your Shu-Te student Google account (s…@stu.edu.tw).
            </p>

            {authError && (
              <div
                role="alert"
                className="mt-4 w-full rounded-control border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 bg-feedback-danger-surface p-3 text-xs font-bold text-feedback-danger-edge"
              >
                {authError}
              </div>
            )}

            <div className="mt-6 flex w-full flex-col items-center gap-3">
              <ActionButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleGoogleLogin}
                loading={isSigningIn || isLoading}
                loadingLabel="Signing in"
              >
                <AppIcon name="signIn" size={20} />
                Continue with Google
              </ActionButton>
            </div>

            <p className="mt-5 text-center text-xs font-bold leading-relaxed text-ui-muted-strong">
              By creating an account you agree to the{' '}
              <Link to={LEGAL_ROUTES.terms} className="rounded-xs font-extrabold text-brand-primary hover:underline focus-ring-inline">Terms</Link>
              {' '}and{' '}
              <Link to={LEGAL_ROUTES.privacy} className="rounded-xs font-extrabold text-brand-primary hover:underline focus-ring-inline">Privacy Policy</Link>.
            </p>
          </div>

          {/* Quiet footer note */}
          <p className="mt-auto pt-4 text-center text-xs font-bold text-ui-muted-strong">
            Free during beta
          </p>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Root>
  );
}
