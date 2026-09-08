import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import {
  ActionButton,
  AppIcon,
  BrandWordmark,
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
  const reduceMotion = useReducedMotion();

  // Auto-close as soon as a session appears if onClose callback was provided.
  useEffect(() => {
    if (currentUser && onClose) onClose();
  }, [currentUser, onClose]);

  // Support Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSigningIn && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSigningIn, onClose]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      // The auth listener in useAuth updates the store.
    } catch (error: unknown) {
      console.error('Login failed', error);
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Sign-in is unavailable right now. Please try again.',
      );
      setIsSigningIn(false);
    }
  };

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="fixed inset-0 z-[900] flex items-center justify-center p-4 md:p-8 bg-ui-ink/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSigningIn && onClose) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface shadow-ambient-lg md:flex-row md:min-h-[460px]"
        onClick={(e) => e.stopPropagation()}
      >
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
            <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl md:text-4xl">
              Welcome back!
            </h2>
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
            <p className="mt-1.5 text-sm font-semibold text-ui-muted-strong">
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
          </div>

          {/* Quiet footer note */}
          <p className="mt-auto pt-4 text-center text-xs font-semibold text-ui-muted">
            Free forever. Learning works with or without an account.
          </p>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
