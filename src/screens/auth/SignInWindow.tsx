import { debugLogger } from '../../utils/debug/debugLogger';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { getOAuthCallbackErrorMessage, getOAuthLoginErrorMessage } from '../../services/authService';
import { LEGAL_ROUTES } from '../../app/routes';
import { ActionButton, BrandWordmark } from '../../lib/widgets';
import { DeskScene } from './DeskScene';

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

/**
 * Full-page sign-in: the study-desk animation beside the Google sign-in. Accounts are
 * required, so there is nothing to dismiss; it unmounts when a session appears.
 */
export function SignInWindow() {
  const { loginWithGoogle, isLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const reduceMotion = useReducedMotion();

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

  // Beats: the desk builds first, then the title, then the sign-in.
  const rise = (delay: number) => reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.46, delay, ease: EASE_OUT } };

  return (
    <div className="flex min-h-dvh flex-col bg-ui-canvas text-ui-ink-strong">
      <header className="flex justify-center px-6 pt-7 lg:justify-start lg:px-9">
        <BrandWordmark />
      </header>

      <main className="flex flex-1 flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-18 lg:px-16 lg:pb-16">
        <div className="flex flex-1 items-end justify-center lg:flex-none">
          <DeskScene leaving={isSigningIn} className="size-75 sm:size-100 lg:size-140" />
        </div>

        <div className="mx-auto flex w-full max-w-100 flex-1 flex-col px-6 lg:mx-0 lg:flex-none lg:px-0">
          <motion.div {...rise(0.42)} className="text-center lg:text-left">
            <h1 className="text-4xl font-black leading-tight tracking-tight lg:text-5xl">Welcome</h1>
            <p className="mt-2 font-chinese-sans text-lg font-semibold text-ui-muted-strong lg:text-xl">歡迎來學中文</p>
          </motion.div>

          <motion.div {...rise(0.52)} className="mt-auto flex flex-col gap-5 pt-8 lg:mt-11 lg:pt-0">
            <SchoolAccountHint />

            {authError && (
              <div role="alert" className="rounded-sm bg-feedback-danger-surface px-3.5 py-3 text-sm font-bold leading-snug text-feedback-danger-edge">
                {authError}
              </div>
            )}

            <ActionButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGoogleLogin}
              loading={isSigningIn || isLoading}
              loadingLabel="Opening Google"
              className="normal-case tracking-normal"
            >
              <span aria-hidden="true" className="absolute left-3 flex size-9 items-center justify-center rounded-xs bg-ui-surface">
                <GoogleMark />
              </span>
              Continue with Google
            </ActionButton>
          </motion.div>
        </div>
      </main>

      <motion.p {...rise(0.62)} className="px-6 pb-6 pt-4 text-center text-xs font-bold text-ui-muted">
        By continuing you agree to the{' '}
        <Link to={LEGAL_ROUTES.terms} className="rounded-xs font-extrabold text-brand-primary hover:underline focus-ring-inline">Terms</Link>
        {' '}and{' '}
        <Link to={LEGAL_ROUTES.privacy} className="rounded-xs font-extrabold text-brand-primary hover:underline focus-ring-inline">Privacy Policy</Link>.
      </motion.p>
    </div>
  );
}

/** Which account to pick in Google, written as the address with a blank to fill. */
function SchoolAccountHint() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-center gap-3.5">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-sm border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface font-chinese text-base font-bold tracking-wide text-ui-ink-strong"
      >
        樹德
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-ui-ink-strong">For Shu-Te students</p>
        <p className="flex items-baseline text-base font-extrabold text-ui-ink" aria-label="Use your s…@stu.edu.tw school account">
          <span aria-hidden="true">s</span>
          <span aria-hidden="true" className="relative mx-1.5 inline-block w-16 border-b-[3px] border-dashed border-ui-border">
            <motion.span
              className="absolute bottom-0.5 left-0 h-4 w-0.5 rounded-full bg-brand-primary"
              animate={reduceMotion ? undefined : { opacity: [1, 1, 0, 0] }}
              transition={{ duration: 1.1, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
            />
          </span>
          <span aria-hidden="true">@stu.edu.tw</span>
        </p>
      </div>
    </div>
  );
}

/** Google's multicolour "G"; brand colours are Google's own, not app tokens. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
