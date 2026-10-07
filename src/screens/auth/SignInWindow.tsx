import { debugLogger } from '../../utils/debugLogger';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { LEGAL_ROUTES } from '../../app/routes';
import {
  ActionButton,
  AppIcon,
  BrandWordmark,
  Dialog,
  IconActionButton,
  VideoBackground,
} from '../../lib/widgets';

interface SignInWindowProps {
  onClose?: () => void;
}

/**
 * Split-screen sign-in window with video background.
 * Supports signing in with Google or continuing as guest.
 */
export function SignInWindow({ onClose }: SignInWindowProps = {}) {
  const { currentUser, loginWithGoogle, isLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Auto-close as soon as a session appears if onClose callback was provided.
  useEffect(() => {
    if (currentUser && onClose) onClose();
  }, [currentUser, onClose]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      // The auth listener in useAuth updates the store.
    } catch (error: unknown) {
      debugLogger.error('Auth', 'Login failed', error);
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Sign-in is unavailable right now. Please try again.',
      );
      setIsSigningIn(false);
    }
  };

  return (
    <Dialog.Root
      open={true}
      onClose={onClose}
      zIndexClassName="z-auth"
    >
      <Dialog.Backdrop closeOnClick={!isSigningIn && Boolean(onClose)} />
      <Dialog.Content
        size="3xl"
        depth="xl"
        ariaLabel="Sign in"
        closeOnEscape={!isSigningIn && Boolean(onClose)}
        className="p-0 overflow-hidden rounded-feature md:min-h-[460px] max-h-none"
      >
      <div className="relative flex w-full flex-col overflow-hidden md:flex-row md:min-h-[460px]">
        {/* Left column: Looping video + Welcome copy */}
        <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden p-6 sm:p-8 md:min-h-[460px] md:w-1/2">
          <VideoBackground
            mp4Src="/videos/login-bg.mp4"
            webmSrc="/videos/login-bg.webm"
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
          {/* Close button in top-right */}
          <div className="flex justify-end">
            {onClose && (
              <IconActionButton
                onClick={onClose}
                label="Close sign in"
                icon={<AppIcon name="close" size={20} />}
                className="h-9 w-9 shrink-0 rounded-full hover:bg-ui-hover"
              />
            )}
          </div>

          {/* Centered Sign In form */}
          <div className="my-auto mx-auto w-full max-w-sm py-2">
            <h1 className="text-2xl font-black tracking-tight text-ui-ink-strong md:text-3xl">
              Sign In
            </h1>
            <p className="mt-1.5 text-sm font-bold text-ui-muted-strong">
              Sign in with Google to sync your learning progress.
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

              {onClose && (
                <ActionButton
                  variant="quiet"
                  size="md"
                  onClick={onClose}
                  disabled={isSigningIn}
                  className="text-ui-muted-strong hover:text-ui-ink"
                >
                  Continue as guest
                </ActionButton>
              )}
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
            Free forever. Learning works with or without an account.
          </p>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Root>
  );
}
